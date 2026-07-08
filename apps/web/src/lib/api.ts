import type {
  Paginated,
  PostSummary,
  PostDetail,
  SiteSettings,
  SearchResult,
} from '@blog/shared';
import type { CategoryView, TagView, ArchiveYear } from '../types';

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`请求失败: ${res.status}`);
  }
  return (await res.json()) as T;
}

export interface ListPostsParams {
  page?: number;
  pageSize?: number;
  category?: string;
  tag?: string;
}

export const api = {
  listPosts: (params: ListPostsParams = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params.category) qs.set('category', params.category);
    if (params.tag) qs.set('tag', params.tag);
    const q = qs.toString();
    return get<Paginated<PostSummary>>(`/posts${q ? `?${q}` : ''}`);
  },
  getPost: (slug: string) => get<PostDetail>(`/posts/${encodeURIComponent(slug)}`),
  listFeatured: () => get<{ items: PostSummary[] }>('/posts/featured'),
  listCategories: () => get<{ items: CategoryView[] }>('/categories'),
  listTags: () => get<{ items: TagView[] }>('/tags'),
  search: (q: string) => get<SearchResult>(`/search?q=${encodeURIComponent(q)}`),
  archive: () => get<{ groups: ArchiveYear[] }>('/archive'),
  siteSettings: () => get<SiteSettings>('/site-settings'),
};
