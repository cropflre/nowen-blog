export type PostStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type PostVisibility = 'public' | 'private';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

export interface Author {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
}

/** 列表/卡片用的文章摘要，不含正文 */
export interface PostSummary {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  coverUrl: string | null;
  status: PostStatus;
  isFeatured: boolean;
  isPinned: boolean;
  readingTime: number;
  viewCount: number;
  likeCount: number;
  publishedAt: string | null;
  updatedAt: string;
  author: Author;
  categories: Category[];
  tags: Tag[];
  titleHighlight?: string | null;
  snippet?: string | null;
}

export interface PostDetail extends PostSummary {
  contentMd: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  createdAt: string;
}

export interface PostContext {
  previous: PostSummary | null;
  next: PostSummary | null;
  related: PostSummary[];
}

export interface ArchiveGroup {
  year: number;
  total: number;
  months: {
    month: number;
    total: number;
    posts: PostSummary[];
  }[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SiteSettings {
  siteTitle: string;
  siteDescription: string;
  slogan: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  authorName: string;
  social: {
    twitter: string | null;
    email: string | null;
    rss: boolean;
  };
  themeColor: string;
  icp: string | null;
  footerText: string | null;
  defaultSeoTitle: string | null;
  defaultSeoDescription: string | null;
  defaultOgImage: string | null;
  commentsEnabled: boolean;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  homepageUrl: string | null;
  language: string | null;
  topics: string[];
  isFeatured: boolean;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  query: string;
  items: PostSummary[];
  total: number;
  page: number;
  pageSize: number;
}
