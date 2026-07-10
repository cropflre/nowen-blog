import type {
  PostSummary,
  PostDetail,
  SiteSettings,
  Category,
  Tag,
  Paginated,
  SearchResult,
  PostStatus,
  Author,
} from '@blog/shared';

export type {
  PostSummary,
  PostDetail,
  SiteSettings,
  Category,
  Tag,
  Paginated,
  SearchResult,
  PostStatus,
  Author,
};

export interface AdminPostView {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  contentMd: string;
  coverUrl: string | null;
  status: PostStatus;
  isFeatured: boolean;
  isPinned: boolean;
  readingTime: number;
  wordCount: number;
  viewCount: number;
  likeCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: Author;
  categoryIds: string[];
  tagIds: string[];
  categories: Category[];
  tags: Tag[];
}

export interface AdminPostInput {
  title: string;
  slug?: string;
  summary?: string | null;
  contentMd: string;
  coverUrl?: string | null;
  status?: PostStatus;
  isFeatured?: boolean;
  isPinned?: boolean;
  categoryIds?: string[];
  tagIds?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
}

export interface AdminListPostsParams {
  page?: number;
  pageSize?: number;
  status?: PostStatus | 'all';
}

export interface AdminCategoryView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  postCount: number;
  createdAt: string;
}

export interface AdminTagView {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  postCount: number;
  createdAt: string;
}

export interface AdminCategoryInput {
  name: string;
  slug?: string;
  description?: string | null;
  color?: string | null;
  sortOrder?: number;
}

export interface AdminTagInput {
  name: string;
  slug?: string;
  color?: string | null;
}

export interface CategoryView extends Category {
  postCount: number;
}

export interface TagView extends Tag {
  postCount: number;
}

export interface ArchiveMonth {
  month: number;
  total: number;
  posts: PostSummary[];
}

export interface ArchiveYear {
  year: number;
  total: number;
  months: ArchiveMonth[];
}

export interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  role: string;
}

export interface AssetView {
  id: string;
  filename: string | null;
  storageKey: string;
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  contentHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommentView {
  id: string;
  authorName: string;
  authorWebsite: string | null;
  content: string; // 已转义 HTML
  createdAt: string;
  approvedAt: string | null;
}

export interface CommentSubmitResult {
  id: string;
  status: 'pending';
  message: string;
}
