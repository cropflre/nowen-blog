import type {
  Paginated,
  PostSummary,
  PostDetail,
  SiteSettings,
  SearchResult,
} from '@blog/shared';
import type {
  CategoryView,
  TagView,
  ArchiveYear,
  AdminUser,
  AdminPostView,
  AdminPostInput,
  AdminListPostsParams,
  AdminCategoryView,
  AdminTagView,
  AdminCategoryInput,
  AdminTagInput,
  AssetView,
  CommentView,
} from '../types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    // 始终携带 Cookie（含 session），确保 HttpOnly Cookie 随请求收发
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `请求失败: ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
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
    return request<Paginated<PostSummary>>(`/posts${q ? `?${q}` : ''}`);
  },
  getPost: (slug: string) => request<PostDetail>(`/posts/${encodeURIComponent(slug)}`),
  listFeatured: () => request<{ items: PostSummary[] }>('/posts/featured'),
  listCategories: () => request<{ items: CategoryView[] }>('/categories'),
  listTags: () => request<{ items: TagView[] }>('/tags'),
  search: (q: string, opts?: { page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    qs.set('q', q);
    if (opts?.page) qs.set('page', String(opts.page));
    if (opts?.pageSize) qs.set('pageSize', String(opts.pageSize));
    return request<SearchResult>(`/search?${qs.toString()}`);
  },
  archive: () => request<{ groups: ArchiveYear[] }>('/archive'),
  siteSettings: () => request<SiteSettings>('/site-settings'),

  // 后台认证
  login: (username: string, password: string) =>
    request<{ user: AdminUser }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<{ ok: boolean }>('/admin/logout', { method: 'POST' }),
  getMe: () => request<{ user: AdminUser }>('/admin/me'),

  // 后台文章管理
  listAdminPosts: (params: AdminListPostsParams = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params.status && params.status !== 'all') qs.set('status', params.status);
    const q = qs.toString();
    return request<{ items: AdminPostView[]; total: number; page: number; pageSize: number }>(
      `/admin/posts${q ? `?${q}` : ''}`,
    );
  },
  getAdminPost: (id: string) => request<AdminPostView>(`/admin/posts/${id}`),
  createAdminPost: (payload: AdminPostInput) =>
    request<AdminPostView>('/admin/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateAdminPost: (id: string, payload: AdminPostInput) =>
    request<AdminPostView>(`/admin/posts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteAdminPost: (id: string) =>
    request<{ ok: boolean }>(`/admin/posts/${id}`, { method: 'DELETE' }),
  publishAdminPost: (id: string) =>
    request<AdminPostView>(`/admin/posts/${id}/publish`, { method: 'POST' }),
  unpublishAdminPost: (id: string) =>
    request<AdminPostView>(`/admin/posts/${id}/unpublish`, { method: 'POST' }),

  // 后台分类管理
  listAdminCategories: () => request<{ items: AdminCategoryView[] }>('/admin/categories'),
  getAdminCategory: (id: string) => request<AdminCategoryView>(`/admin/categories/${id}`),
  createAdminCategory: (payload: AdminCategoryInput) =>
    request<AdminCategoryView>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateAdminCategory: (id: string, payload: AdminCategoryInput) =>
    request<AdminCategoryView>(`/admin/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteAdminCategory: (id: string) =>
    request<{ ok: boolean }>(`/admin/categories/${id}`, { method: 'DELETE' }),

  // 后台标签管理
  listAdminTags: () => request<{ items: AdminTagView[] }>('/admin/tags'),
  getAdminTag: (id: string) => request<AdminTagView>(`/admin/tags/${id}`),
  createAdminTag: (payload: AdminTagInput) =>
    request<AdminTagView>('/admin/tags', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateAdminTag: (id: string, payload: AdminTagInput) =>
    request<AdminTagView>(`/admin/tags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteAdminTag: (id: string) =>
    request<{ ok: boolean }>(`/admin/tags/${id}`, { method: 'DELETE' }),

  // 媒体库管理
  uploadAsset: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<AssetView>('/admin/assets/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // 让浏览器自动设置 Content-Type 为 multipart/form-data
    });
  },
  listAssets: (params: { page?: number; pageSize?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    const q = qs.toString();
    return request<{ items: AssetView[]; total: number; page: number; pageSize: number }>(
      `/admin/assets${q ? `?${q}` : ''}`,
    );
  },
  getAsset: (id: string) => request<AssetView>(`/admin/assets/${id}`),
  updateAsset: (id: string, payload: { alt?: string | null; filename?: string | null }) =>
    request<AssetView>(`/admin/assets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteAsset: (id: string) =>
    request<{ ok: boolean }>(`/admin/assets/${id}`, { method: 'DELETE' }),

  // 评论功能
  getPostComments: (slug: string, page: number = 1) => {
    const qs = new URLSearchParams();
    qs.set('page', String(page));
    return request<{
      items: CommentView[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/api/posts/${slug}/comments?${qs.toString()}`);
  },
  submitComment: (slug: string, data: { authorName: string; authorEmail: string; content: string; authorWebsite?: string }) =>
    request<{ id: string; status: string; message: string }>(`/api/posts/${slug}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
