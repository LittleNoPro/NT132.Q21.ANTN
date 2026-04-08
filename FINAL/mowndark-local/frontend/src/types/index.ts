export interface User {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  shortid: string;
  alias: string | null;
  title: string;
  content?: string;
  description?: string;
  permission: 'freely' | 'editable' | 'limited' | 'locked' | 'protected' | 'private';
  view_count: number;
  owner_id: string | null;
  last_change_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface SearchResult extends Note {
  score?: number;
}
