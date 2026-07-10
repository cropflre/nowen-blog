import type {
  Paginated,
  PostSummary,
  PostDetail,
  PostContext,
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
  AssetReferencesResult,
  CommentView,
  CommentSubmitResult,
  AdminCommentView,
  AdminListCommentsParams,
  CommentStatus,
  PostViewResult,
  DashboardStats,
} from '../types';

const BASE = '/api';
const VISITOR_STORAGE_KEY = 'nowen-blog-visitor-id';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers,
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

function getAnonymousVisitorId(): string {
  if (typeof window === 'undefined') return 'server-render';
  try {
    const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VISITOR_STORAGE_KEY, id);
    return id;
  } catch {
    return `ephemeral-${Date.now().toString(36)}`;
  }
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
  getPostContext: (slug: string) =>
    request<PostContext>(`/posts/${encodeURIComponent(slug)}/context`),
  trackPostView: (slug: string) =>
    request<PostViewResult>(`/posts/${encodeURIComponent(slug)}/views`, {
      method: 'POST',
      headers: { 'x-visitor-id': getAnonymousVisitorId() },
      body: JSON.stringify({
        referrer: typeof document !== 'undefined' && document.referrer ? document.referrer : null,
      }),
    }),
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

  login: (username: string, password: string) =>
    request<{ user: AdminUser }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<{ ok: boolean }>('/admin/logout', { method: 'POST' }),
  getMe: () => request<{ user: AdminUser }>('/admin/me'),
  getDashboardStats: () => request<DashboardStats>('/admin/analytics/dashboard'),

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

  uploadAsset: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<AssetView>('/admin/assets/upload', {
      method: 'POST',
      body: formData,
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
  getAssetReferences: (id: string) =>
    request<AssetReferencesResult>(`/admin/assets/${id}/references`),
  updateAsset: (id: string, payload: { alt?: string | null; filename?: string | null }) =>
    request<AssetView>(`/admin/assets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteAsset: (id: string, force = false) =>
    request<{ ok: boolean }>(`/admin/assets/${id}${force ? '?force=true' : ''}`, {
      method: 'DELETE',
    }),

  getPostComments: (slug: string, page: number = 1) => {
    const qs = new URLSearchParams();
    qs.set('page', String(page));
    return request<{
      items: CommentView[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/posts/${slug}/comments?${qs.toString()}`);
  },
  submitComment: (
    slug: string,
    data: {
      authorName: string;
      authorEmail: string;
      content: string;
      authorWebsite?: string;
    },
  ) =>
    request<CommentSubmitResult>(`/posts/${slug}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listAdminComments: (params: AdminListCommentsParams = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params.status && params.status !== 'all') qs.set('status', params.status);
    if (params.postId) qs.set('postId', params.postId);
    if (params.postSlug) qs.set('postSlug', params.postSlug);
    const q = qs.toString();
    return request<{
      items: AdminCommentView[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/admin/comments${q ? `?${q}` : ''}`);
  },
  getAdminComment: (id: string) => request<AdminCommentView>(`/admin/comments/${id}`),
  updateAdminComment: (
    id: string,
    payload: Partial<{
      authorName: string;
      authorEmail: string;
      authorWebsite: string;
      content: string;
      status: CommentStatus;
    }>,
  ) =>
    request<AdminCommentView>(`/admin/comments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  approveAdminComment: (id: string) =>
    request<AdminCommentView>(`/admin/comments/${id}/approve`, { method: 'POST' }),
  rejectAdminComment: (id: string) =>
    request<AdminCommentView>(`/admin/comments/${id}/reject`, { method: 'POST' }),
  markAdminCommentSpam: (id: string) =>
    request<AdminCommentView>(`/admin/comments/${id}/spam`, { method: 'POST' }),
  deleteAdminComment: (id: string) =>
    request<{ ok: boolean; message: string }>(`/admin/comments/${id}`, { method: 'DELETE' }),
};
