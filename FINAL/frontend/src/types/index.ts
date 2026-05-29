export interface User {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role?: 'user' | 'admin';
  created_at: string;
}

export interface Note {
  id: string;
  shortid: string;
  alias: string | null;
  title: string;
  tags?: string[];
  content?: string;
  description?: string;
  permission: 'freely' | 'editable' | 'limited' | 'locked' | 'protected' | 'private';
  view_count: number;
  owner_id: string | null;
  last_change_user_id: string | null;
  embedding_model?: string | null;
  embedding_dimensions?: number | null;
  score?: number;
  created_at: string;
  updated_at: string;
}

export interface SearchResponse {
  query: string;
  mode: 'text' | 'vector';
  count: number;
  total_indexed?: number;
  results: Note[];
}

export interface ClusterStatus {
  healthy: boolean;
  clusterType?: string;
  database?: string;
  shardCount?: number;
  shards?: ShardInfo[];
  collections?: string[];
  error?: string;
}

export interface ShardInfo {
  id: string;
  host: string;
}

export interface SearchStats {
  text_search_available: boolean;
  vector_search_available: boolean;
  total_notes: number;
  notes_with_embedding: number;
}

export interface WriteConcernResult {
  batchId: string;
  requestedPerMode: number;
  asyncStyle: {
    writeConcern: Record<string, unknown>;
    acknowledged: boolean;
    elapsedMs: number;
    verifiedCount: number;
  };
  syncDurable: {
    writeConcern: Record<string, unknown>;
    acknowledged: boolean;
    elapsedMs: number;
    verifiedCount: number;
  };
  pass: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
