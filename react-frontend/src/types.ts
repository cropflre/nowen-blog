export interface Post {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  html_content: string; // 鏈嶅姟绔娓叉煋鐨?HTML
  cover: string;
  tags: string; // 閫楀彿鍒嗛殧鐨勫瓧绗︿覆
  status: 'draft' | 'published';
  read_time: number;
  view_count: number; // 娴忚閲?
  carousel_order: number; // 骞荤伅鐗囨帓搴?
  created_at: string;
  updated_at: string;
}

export interface SiteInfo {
  id?: number;
  name: string;
  title: string;
  bio: string;
  avatar: string;
  email: string;
  github: string;
  twitter: string;
  skills: string; // 閫楀彿鍒嗛殧鐨勫瓧绗︿覆
  beian_enabled?: boolean; // 澶囨淇℃伅寮€鍏?
  beian_number?: string;   // 澶囨鍙?
}

export interface User {
  id: number;
  username: string;
  email?: string;
  role: string;
  must_change_password?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  role?: string;
  must_change_password?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email?: string;
  password: string;
}

export interface UpdatePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  username: string;
  email: string;
}

export interface PostRequest {
  title: string;
  slug: string;
  summary?: string;
  content?: string;
  cover?: string;
  tags?: string[];
  status: 'draft' | 'published';
}

export interface Project {
  id: number;
  title: string;
  description: string;
  image: string;
  category: string;
  tech: string[];
  github?: string;
  link?: string;
  featured?: boolean;
  order?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 缁熶竴鍐呭妯″瀷
export interface Content {
  id: number;
  type: 'blog' | 'doc';
  project_name: string;
  github_url: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  html_content: string;
  tags: string;
  status: 'draft' | 'published';
  read_time: number;
  view_count: number;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface DocTreeItem {
  id: number;
  title: string;
  slug: string;
  order: number;
}

export interface ProjectInfo {
  project_name: string;
  github_url: string;
  doc_count: number;
}

// 鍏ㄥ眬鎼滅储缁撴灉
export interface SearchResult {
  id: number;
  title: string;
  slug: string;
  summary: string;
  tags: string;
  type: 'blog' | 'doc';
  project_name?: string;
  created_at: string;
}

// 鍥剧墖淇℃伅
export interface ImageInfo {
  id: number;
  filename: string;
  original_name: string;
  path: string;
  url: string;
  size: number;
  mime_type: string;
  created_at: string;
}
export interface Comment {
  id: number;
  post_id: number;
  parent_id: number | null;
  nickname: string;
  email: string;
  website: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface CommentFormData {
  parent_id?: number | null;
  nickname: string;
  email: string;
  website: string;
  content: string;
}

// ==================== GitHub 椤圭洰鐩稿叧绫诲瀷 ====================

// GitHub 浠撳簱鎵€鏈夎€呬俊鎭?
export interface GitHubOwner {
  login: string;
  avatar_url: string;
  html_url: string;
}

// GitHub 浠撳簱淇℃伅
export interface GitHubRepoInfo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  clone_url: string;
  homepage: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  language: string;
  topics: string[];
  created_at: string;
  updated_at: string;
  default_branch: string;
  private: boolean;
  size: number;
  owner: GitHubOwner;
}

// GitHub 椤圭洰淇℃伅鍝嶅簲
export interface GitHubProjectResponse {
  success: boolean;
  message?: string;
  data?: GitHubRepoInfo;
}

// ==================== AI 写作助手相关类型 ====================

export interface AISettings {
  ai_api_url: string;
  ai_api_key: string;
  ai_api_key_set: boolean;
  ai_model: string;
}

export type AIAction = 
  | 'continue' 
  | 'rewrite' 
  | 'polish' 
  | 'shorten' 
  | 'expand'
  | 'translate_en' 
  | 'translate_zh' 
  | 'summarize' 
  | 'explain'
  | 'fix_grammar' 
  | 'format_markdown' 
  | 'format_code' 
  | 'custom';
