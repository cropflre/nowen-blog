import type { Project } from '@blog/shared';
import type {
  NewsletterAdminResult,
  NewsletterCampaign,
  NewsletterSubscriber,
  ProjectInput,
} from '../blog19';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });
  if (!response.ok) {
    let message = `请求失败: ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore non-json error body
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export const projectsApi = {
  listPublic: (limit = 24) => request<{ items: Project[] }>(`/projects?limit=${limit}`),
  listAdmin: () => request<{ items: Project[] }>('/admin/projects'),
  create: (payload: ProjectInput) =>
    request<Project>('/admin/projects', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Partial<ProjectInput>) =>
    request<Project>(`/admin/projects/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (id: string) => request<{ ok: true }>(`/admin/projects/${id}`, { method: 'DELETE' }),
};

export const newsletterApi = {
  subscribe: (email: string, source = 'homepage', website = '') =>
    request<{ ok: true; message: string }>('/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({ email, source, website }),
    }),
  unsubscribe: (token: string) =>
    request<{ ok: true; message: string }>('/newsletter/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  listAdmin: (params: { page?: number; pageSize?: number; status?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    if (params.status) search.set('status', params.status);
    const query = search.toString();
    return request<NewsletterAdminResult>(`/admin/newsletter${query ? `?${query}` : ''}`);
  },
  activate: (id: string) =>
    request<NewsletterSubscriber>(`/admin/newsletter/${id}/activate`, { method: 'POST' }),
  unsubscribeAdmin: (id: string) =>
    request<NewsletterSubscriber>(`/admin/newsletter/${id}/unsubscribe`, { method: 'POST' }),
  remove: (id: string) => request<{ ok: true }>(`/admin/newsletter/${id}`, { method: 'DELETE' }),
  sendPost: (postId: string, subject?: string) =>
    request<NewsletterCampaign>('/admin/newsletter/send-post', {
      method: 'POST',
      body: JSON.stringify({ postId, subject: subject?.trim() || undefined }),
    }),
};
