export type PostStatus = 'draft' | 'published' | 'archived';
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
}

/** 文章详情，含 Markdown 正文 */
export interface PostDetail extends PostSummary {
  contentMd: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  createdAt: string;
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
    github: string | null;
    twitter: string | null;
    email: string | null;
    rss: boolean;
  };
  themeColor: string;
  icp: string | null;
}

/** 搜索命中项：在 PostSummary 基础上附加 FTS 高亮片段（可能为空） */
export interface SearchHit extends PostSummary {
  snippet: string | null;
}

export interface SearchResult {
  query: string;
  items: SearchHit[];
  total: number;
  page: number;
  pageSize: number;
  /** 实际命中的搜索引擎：fts = SQLite FTS5，like = SQL LIKE 兼容回退 */
  source: 'fts' | 'like';
}
