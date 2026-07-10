export type AiProvider = 'openai' | 'deepseek' | 'qwen' | 'doubao' | 'ollama' | 'custom';

export type AiAction =
  | 'title'
  | 'summary'
  | 'seo'
  | 'tags'
  | 'outline'
  | 'polish'
  | 'rewrite'
  | 'shorten'
  | 'expand'
  | 'continue'
  | 'format_markdown'
  | 'custom';

export interface AiSettingsView {
  enabled: boolean;
  provider: AiProvider;
  apiUrl: string;
  apiKeySet: boolean;
  apiKeyMasked: string | null;
  model: string;
  systemPrompt: string;
  updatedAt: string;
}

export interface AiSettingsInput {
  enabled: boolean;
  provider: AiProvider;
  apiUrl: string;
  apiKey?: string;
  clearApiKey?: boolean;
  model: string;
  systemPrompt?: string | null;
}

export interface AiGeneratedFields {
  title?: string;
  summary?: string;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
}

export interface AiGenerateResult {
  action: AiAction;
  text: string;
  fields?: AiGeneratedFields;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`/api/admin/ai${path}`, {
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
      // ignore non-json response
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export const aiApi = {
  getSettings: () => request<AiSettingsView>('/settings'),
  updateSettings: (payload: AiSettingsInput) =>
    request<AiSettingsView>('/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  testConnection: () =>
    request<{ success: true; message: string; preview: string }>('/test', { method: 'POST' }),
  listModels: () => request<{ items: string[] }>('/models'),
  generate: (payload: { action: AiAction; text: string; context?: string; customPrompt?: string }) =>
    request<AiGenerateResult>('/generate', { method: 'POST', body: JSON.stringify(payload) }),
};
