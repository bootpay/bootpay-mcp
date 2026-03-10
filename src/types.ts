export interface Env {
  DOCS_KV: KVNamespace;
}

export interface DocMeta {
  path: string;
  title: string;
  description: string;
  category: string;
  slug: string;
}

export interface DocIndex {
  docs: DocMeta[];
  categories: string[];
  lastUpdated: string;
}

export interface SearchResult extends DocMeta {
  snippet: string;
  score: number;
}
