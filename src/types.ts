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
