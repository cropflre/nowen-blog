import type { SiteSettings } from '@blog/shared';

export type AdminSiteSettings = SiteSettings & { updatedAt: string };

async function request<T>(init?: RequestInit): Promise<T> {
  const response = await fetch('/api/admin/settings', {
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
      // 保留默认错误信息。
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export const adminSettingsApi = {
  get: () => request<AdminSiteSettings>(),
  update: (settings: SiteSettings) =>
    request<AdminSiteSettings>({
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
};
