export interface Post {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  html_content: string; // 服务端预渲染的 HTML
  cover: string;
  tags: string; // 逗号分隔的字符串
  status: 'draft' | 'published';
  read_time: number;
  view_count: number; // 浏览量
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
  skills: string; // 逗号分隔的字符串
}

export interface User {
  id: number;
  username: string;
  email?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  role?: string;
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

// 统一内容模型
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

// 全局搜索结果
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

// 图片信息
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
