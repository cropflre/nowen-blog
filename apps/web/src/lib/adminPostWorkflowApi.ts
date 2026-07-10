import type {
  AdminPostInput,
  AdminPostView,
  PostAutosaveView,
  PostVersionDetail,
  PostVersionItem,
} from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    let message = `请求失败: ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore non-json errors
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export const adminPostWorkflowApi = {
  archive: (postId: string) =>
    request<AdminPostView>(`/admin/posts/${postId}/archive`, { method: 'POST' }),
  restore: (postId: string) =>
    request<AdminPostView>(`/admin/posts/${postId}/restore`, { method: 'POST' }),
  listVersions: (postId: string) =>
    request<{ items: PostVersionItem[] }>(`/admin/posts/${postId}/versions`),
  getVersion: (postId: string, versionId: string) =>
    request<PostVersionDetail>(`/admin/posts/${postId}/versions/${versionId}`),
  restoreVersion: (postId: string, versionId: string) =>
    request<AdminPostView>(`/admin/posts/${postId}/versions/${versionId}/restore`, {
      method: 'POST',
    }),
  getAutosave: (postId: string) =>
    request<{ autosave: PostAutosaveView | null }>(`/admin/posts/${postId}/autosave`),
  saveAutosave: (postId: string, payload: Partial<AdminPostInput>) =>
    request<PostAutosaveView>(`/admin/posts/${postId}/autosave`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteAutosave: (postId: string) =>
    request<{ ok: boolean }>(`/admin/posts/${postId}/autosave`, { method: 'DELETE' }),
};
