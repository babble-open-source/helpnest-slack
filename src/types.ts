export interface HelpNestArticle {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  collectionName?: string;
  url: string; // full URL to the article
}

export interface SearchResult {
  articles: HelpNestArticle[];
  query: string;
}

// Shape returned by the HelpNest REST API for search
export interface ApiSearchResponse {
  articles: ApiArticle[];
}

// Shape returned by the HelpNest REST API for a single article
export interface ApiArticle {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  collection?: {
    name: string;
  };
}

// Conversation + AI answer types

export interface ConversationCreated {
  id: string;
  sessionToken: string;
  aiEnabled: boolean;
  greeting?: string | null;
}

export interface AiSource {
  id: string;
  title: string;
  slug: string;
  collection?: { slug: string; title: string };
}

export interface AiAnswer {
  answer: string;
  sources: AiSource[];
  escalated: boolean;
}

// SSE events streamed by /api/conversations/:id/messages
export type SseEvent =
  | { type: 'sources'; sources: AiSource[] }
  | { type: 'text'; text: string }
  | { type: 'confidence'; score: number }
  | { type: 'action'; action: 'escalate' | 'clarify' }
  | { type: 'done' }
  | { type: 'error'; message: string };
