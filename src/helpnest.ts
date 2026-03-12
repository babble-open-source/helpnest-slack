import type { HelpNestArticle, ApiSearchResponse, ApiArticle, ConversationCreated, AiAnswer, SseEvent } from './types.js';

interface HelpNestClientOptions {
  baseUrl: string;
  apiKey: string;
  workspaceSlug: string;
}

export class HelpNestClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly workspaceSlug: string;

  constructor({ baseUrl, apiKey, workspaceSlug }: HelpNestClientOptions) {
    // Strip trailing slash so URL construction is consistent
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.workspaceSlug = workspaceSlug;
  }

  private get authHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private mapArticle(article: ApiArticle): HelpNestArticle {
    return {
      id: article.id,
      title: article.title,
      excerpt: article.excerpt,
      slug: article.slug,
      collectionName: article.collection?.name,
      url: `${this.baseUrl}/${this.workspaceSlug}/help/${article.slug}`,
    };
  }

  async search(query: string): Promise<HelpNestArticle[]> {
    const url = `${this.baseUrl}/api/search?q=${encodeURIComponent(query)}&workspace=${encodeURIComponent(this.workspaceSlug)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.authHeaders,
    });

    if (!response.ok) {
      throw new HelpNestError(
        `Search request failed: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    const data = (await response.json()) as ApiSearchResponse;

    if (!Array.isArray(data.articles)) {
      throw new HelpNestError('Unexpected API response: missing articles array', 502);
    }

    return data.articles.map((article) => this.mapArticle(article));
  }

  async getArticle(id: string): Promise<HelpNestArticle> {
    const url = `${this.baseUrl}/api/articles/${encodeURIComponent(id)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.authHeaders,
    });

    if (!response.ok) {
      throw new HelpNestError(
        `Get article request failed: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    const article = (await response.json()) as ApiArticle;

    return this.mapArticle(article);
  }

  /**
   * Create a new conversation session for the Slack bot.
   * Returns a sessionToken used to send messages as a customer.
   */
  async createConversation(customerName: string): Promise<ConversationCreated> {
    const url = `${this.baseUrl}/api/conversations`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceSlug: this.workspaceSlug,
        customerName,
        customerEmail: null,
      }),
    });

    if (!response.ok) {
      throw new HelpNestError(
        `Failed to create conversation: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    return (await response.json()) as ConversationCreated;
  }

  /**
   * Send a message to the AI agent and collect the full streamed answer.
   * Consumes the SSE stream and returns the complete answer text + sources.
   */
  async askAI(
    conversationId: string,
    sessionToken: string,
    question: string,
  ): Promise<AiAnswer> {
    const url = `${this.baseUrl}/api/conversations/${encodeURIComponent(conversationId)}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, content: question }),
    });

    if (!response.ok) {
      throw new HelpNestError(
        `AI request failed: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    // Consume the full SSE stream then parse line by line.
    // Slack's response_url supports delayed responses up to 30 minutes,
    // so waiting for the complete stream (typically 3-8 seconds) is fine.
    const raw = await response.text();

    let answer = '';
    let escalated = false;
    const sources: AiAnswer['sources'] = [];

    for (const line of raw.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      try {
        const event = JSON.parse(line.slice(6)) as SseEvent;
        if (event.type === 'text') answer += event.text;
        if (event.type === 'sources') sources.push(...event.sources);
        if (event.type === 'action' && event.action === 'escalate') escalated = true;
      } catch {
        // skip malformed lines
      }
    }

    return { answer: answer.trim(), sources, escalated };
  }
}

export class HelpNestError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'HelpNestError';
    this.statusCode = statusCode;
  }
}
