import type { PostSummary, Category, Tag, Author, PostStatus } from '@blog/shared';

export interface PostRow {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  coverUrl: string | null;
  status: string;
  visibility: string;
  isFeatured: boolean;
  isPinned: boolean;
  readingTime: number;
  wordCount: number;
  viewCount: number;
  likeCount: number;
  scheduledAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  contentMd: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  createdAt: string;
  /** 搜索命中片段（含控制字符标记），由搜索服务注入，非搜索场景为空。 */
  snippet?: string | null;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
    bio: string | null;
  };
  categoryLinks?: { category: Category }[];
  tagLinks?: { tag: Tag }[];
}

export function toSummary(row: PostRow): PostSummary {
  const author: Author = {
    id: row.author.id,
    username: row.author.username,
    avatarUrl: row.author.avatarUrl ?? null,
    bio: row.author.bio ?? null,
  };
  const categories: Category[] = (row.categoryLinks ?? []).map((l) => l.category);
  const tags: Tag[] = (row.tagLinks ?? []).map((l) => l.tag);
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary ?? null,
    coverUrl: row.coverUrl ?? null,
    status: row.status as PostStatus,
    isFeatured: row.isFeatured,
    isPinned: row.isPinned,
    readingTime: row.readingTime,
    viewCount: row.viewCount,
    likeCount: row.likeCount,
    publishedAt: row.publishedAt ?? null,
    updatedAt: row.updatedAt,
    snippet: row.snippet ?? null,
    author,
    categories,
    tags,
  };
}
