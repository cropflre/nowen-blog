import type { DocSpace, DocumentItem } from './docsApi';

const BASE = '/api';
const VISITOR_STORAGE_KEY = 'nowen-blog-help-center-visitor-id';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
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
      // 保留状态码兜底。
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

function visitorId(): string {
  if (typeof window === 'undefined') return 'server-render';
  try {
    const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (existing) return existing;
    const value =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VISITOR_STORAGE_KEY, value);
    return value;
  } catch {
    return `ephemeral-${Date.now().toString(36)}`;
  }
}

export interface HelpCenter extends DocSpace {
  helpCenterVersionId: string | null;
}

export interface HelpCenterInput {
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  isPublished?: boolean;
  sortOrder?: number;
}

export interface HelpCenterSearchItem {
  id: string;
  title: string;
  path: string;
  description: string | null;
  spaceName: string;
  spaceSlug: string;
  updatedAt: string;
}

export interface HelpCenterTreeResponse {
  helpCenter: HelpCenter;
  items: DocumentItem[];
}

export interface HelpCenterPageResponse {
  helpCenter: HelpCenter;
  page: DocumentItem;
  previous: Pick<DocumentItem, 'id' | 'title' | 'path'> | null;
  next: Pick<DocumentItem, 'id' | 'title' | 'path'> | null;
}

export interface HelpDocumentInput {
  parentId?: string | null;
  title: string;
  description?: string | null;
  contentMd?: string;
  status?: 'draft' | 'published' | 'archived';
  sortOrder?: number;
}

export type AgentTask = 'create_help_center' | 'write_document' | 'audit_help_center' | 'update_from_notes';

export interface AgentStep {
  id: string;
  runId: string;
  stepOrder: number;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'waiting' | 'failed' | 'cancelled';
  detail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentChange {
  id: string;
  runId: string;
  action: 'create' | 'update';
  documentId: string | null;
  parentTitle: string | null;
  title: string;
  description: string | null;
  contentMd: string;
  sortOrder: number;
  status: 'pending' | 'applied' | 'dismissed';
  createdAt: string;
  appliedAt: string | null;
}

export interface AgentRun {
  id: string;
  helpCenterId: string;
  task: AgentTask;
  prompt: string;
  status: 'planning' | 'generating' | 'reviewing' | 'completed' | 'failed' | 'cancelled';
  summary: string | null;
  error: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  steps: AgentStep[];
  changes: AgentChange[];
}

export const helpCenterApi = {
  list: () => request<{ items: HelpCenter[] }>('/help-centers'),
  get: (slug: string) =>
    request<{ helpCenter: HelpCenter }>(`/help-centers/${encodeURIComponent(slug)}`),
  tree: (slug: string) =>
    request<HelpCenterTreeResponse>(`/help-centers/${encodeURIComponent(slug)}/tree`),
  page: (slug: string, path = '') => {
    const query = new URLSearchParams({ path });
    return request<HelpCenterPageResponse>(
      `/help-centers/${encodeURIComponent(slug)}/page?${query.toString()}`,
    );
  },
  search: (q: string, space?: string) => {
    const query = new URLSearchParams({ q });
    if (space) query.set('space', space);
    return request<{ items: HelpCenterSearchItem[] }>(`/help-centers/search?${query.toString()}`);
  },
  feedback: (documentId: string, helpful: boolean) =>
    request<{ ok: boolean }>(`/docs/documents/${encodeURIComponent(documentId)}/feedback`, {
      method: 'POST',
      headers: { 'x-visitor-id': visitorId() },
      body: JSON.stringify({ helpful }),
    }),

  listAdmin: () => request<{ items: HelpCenter[] }>('/admin/help-centers'),
  create: (payload: HelpCenterInput) =>
    request<HelpCenter>('/admin/help-centers', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Partial<HelpCenterInput>) =>
    request<HelpCenter>(`/admin/help-centers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/admin/help-centers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  listDocuments: (id: string) =>
    request<{ items: DocumentItem[] }>(`/admin/help-centers/${encodeURIComponent(id)}/documents`),
  createDocument: (id: string, payload: HelpDocumentInput) =>
    request<DocumentItem>(`/admin/help-centers/${encodeURIComponent(id)}/documents`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateDocument: (id: string, payload: Partial<HelpDocumentInput>) =>
    request<DocumentItem>(`/admin/help-centers/documents/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteDocument: (id: string) =>
    request<{ ok: boolean }>(`/admin/help-centers/documents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  listAgentRuns: (centerId: string) =>
    request<{ items: AgentRun[] }>(`/admin/help-centers/${encodeURIComponent(centerId)}/agent-runs`),
  getAgentRun: (centerId: string, runId: string) =>
    request<AgentRun>(
      `/admin/help-centers/${encodeURIComponent(centerId)}/agent-runs/${encodeURIComponent(runId)}`,
    ),
  createAgentRun: (
    centerId: string,
    payload: { task: AgentTask; prompt: string; documentId?: string | null },
  ) =>
    request<AgentRun>(`/admin/help-centers/${encodeURIComponent(centerId)}/agent-runs`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  applyAgentRun: (centerId: string, runId: string, changeIds?: string[]) =>
    request<AgentRun>(
      `/admin/help-centers/${encodeURIComponent(centerId)}/agent-runs/${encodeURIComponent(runId)}/apply`,
      { method: 'POST', body: JSON.stringify({ changeIds }) },
    ),
  cancelAgentRun: (centerId: string, runId: string) =>
    request<AgentRun>(
      `/admin/help-centers/${encodeURIComponent(centerId)}/agent-runs/${encodeURIComponent(runId)}/cancel`,
      { method: 'POST', body: '{}' },
    ),
};
