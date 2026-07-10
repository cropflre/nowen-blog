import type { Paginated, PostSummary, PostDetail } from '@blog/shared';
import { toSummary, type PostRow } from '../../lib/mapping';
import * as repo from './posts.repository';

export async function listPublished(
  opts: repo.ListPostsOptions = {},
): Promise<Paginated<PostSummary>> {
  const { rows, total, page, pageSize } = await repo.listPosts(opts);
  return { items: rows.map(toSummary), total, page, pageSize };
}

export async function listFeatured(): Promise<PostSummary[]> {
  const { rows } = await repo.listPosts({ featured: true, pageSize: 6 });
  return rows.map(toSummary);
}

/** 获取文章数据不再直接增加阅读量；真实访问由浏览器显式调用 views 接口记录。 */
export async function getPublishedBySlug(slug: string): Promise<PostDetail | null> {
  const row = await repo.getPostBySlug(slug);
  if (!row) return null;
  const base = toSummary(row as PostRow);
  return {
    ...base,
    contentMd: row.contentMd,
    seoTitle: row.seoTitle ?? null,
    seoDescription: row.seoDescription ?? null,
    canonicalUrl: row.canonicalUrl ?? null,
    createdAt: row.createdAt,
  };
}
