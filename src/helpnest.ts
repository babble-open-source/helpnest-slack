import type { HelpNestArticle, ApiSearchResponse, ApiArticle } from './types.js';

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
}

export class HelpNestError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'HelpNestError';
    this.statusCode = statusCode;
  }
}
