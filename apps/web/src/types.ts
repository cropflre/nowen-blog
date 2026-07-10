import type {
  PostSummary,
  PostDetail,
  PostContext,
  SiteSettings,
  Category,
  Tag,
  Paginated,
  SearchResult,
  PostStatus,
  PostVisibility,
  Author,
} from '@blog/shared';

export type {
  PostSummary,
  PostDetail,
  PostContext,
  SiteSettings,
  Category,
  Tag,
  Paginated,
  SearchResult,
  PostStatus,
  PostVisibility,
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
  visibility: PostVisibility;
  isFeatured: boolean;
  isPinned: boolean;
  readingTime: number;
  wordCount: number;
  viewCount: number;
  likeCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  scheduledAt: string | null;
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
  visibility?: PostVisibility;
  isFeatured?: boolean;
  isPinned?: boolean;
  scheduledAt?: string | null;
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

export interface PostVersionItem {
  id: string;
  version: number;
  reason: string;
  title: string;
  status: PostStatus;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface PostVersionSnapshot {
  title: string;
  slug: string;
  summary: string | null;
  contentMd: string;
  coverUrl: string | null;
  status: PostStatus;
  visibility: PostVisibility;
  isFeatured: boolean;
  isPinned: boolean;
  scheduledAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  categoryIds: string[];
  tagIds: string[];
}

export interface PostVersionDetail extends PostVersionItem {
  snapshot: PostVersionSnapshot;
}

export interface PostAutosaveView {
  postId: string;
  payload: Partial<AdminPostInput>;
  updatedAt: string;
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

export type AssetReferenceType =
  | 'post_cover'
  | 'post_content'
  | 'site_setting'
  | 'version'
  | 'autosave';

export interface AssetReference {
  type: AssetReferenceType;
  id: string;
  title: string;
  field: string;
}

export interface AssetReferencesResult {
  asset: AssetView;
  references: AssetReference[];
  count: number;
}

export interface CommentView {
  id: string;
  authorName: string;
  authorWebsite: string | null;
  content: string;
  createdAt: string;
  approvedAt: string | null;
}

export interface CommentSubmitResult {
  id: string;
  status: 'pending';
  message: string;
}

export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'spam';

export interface AdminCommentView {
  id: string;
  postId: string;
  postTitle?: string;
  authorName: string;
  authorEmail: string;
  authorWebsite: string | null;
  content: string;
  status: CommentStatus;
  ipHash: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  deletedAt: string | null;
}

export interface AdminListCommentsParams {
  page?: number;
  pageSize?: number;
  status?: CommentStatus | 'all';
  postId?: string;
  postSlug?: string;
}

export interface PostViewResult {
  counted: boolean;
  viewCount: number;
}

export interface DashboardStats {
  summary: {
    totalViews: number;
    trackedViews: number;
    uniqueVisitors: number;
    viewsToday: number;
    viewsLast7Days: number;
    publishedPosts: number;
    draftPosts: number;
    pendingComments: number;
    approvedComments: number;
  };
  trend: Array<{
    date: string;
    views: number;
    visitors: number;
  }>;
  topPosts: Array<{
    id: string;
    title: string;
    slug: string;
    viewCount: number;
    trackedViews: number;
    uniqueVisitors: number;
    lastViewedAt: string | null;
  }>;
  trackingStartedAt: string | null;
  generatedAt: string;
}
