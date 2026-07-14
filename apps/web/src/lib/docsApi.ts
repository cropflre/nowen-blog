const BASE = '/api';
const VISITOR_STORAGE_KEY = 'nowen-blog-docs-visitor-id';

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
      // Keep the status fallback.
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

export interface DocVersion {
  id: string;
  spaceId: string;
  version: string;
  label: string;
  status: 'draft' | 'published';
  isDefault: boolean;
  isDeprecated: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocSpace {
  id: string;
  projectId: string | null;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  defaultVersionId: string | null;
  isPublished: boolean;
  sortOrder: number;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
  defaultVersion?: DocVersion | null;
}

export interface DocumentItem {
  id: string;
  spaceId: string;
  versionId: string;
  parentId: string | null;
  title: string;
  slug: string;
  path: string;
  description: string | null;
  contentMd: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private';
  sortOrder: number;
  depth: number;
  sourceType: 'cms' | 'ai';
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocTreeResponse {
  space: DocSpace;
  version: DocVersion;
  items: DocumentItem[];
}

export interface DocPageResponse {
  space: DocSpace;
  version: DocVersion;
  page: DocumentItem;
  previous: Pick<DocumentItem, 'id' | 'title' | 'path'> | null;
  next: Pick<DocumentItem, 'id' | 'title' | 'path'> | null;
}

export interface DocSearchItem {
  id: string;
  title: string;
  path: string;
  description: string | null;
  spaceName: string;
  spaceSlug: string;
  version: string;
  versionLabel: string;
  updatedAt: string;
}

export const docsApi = {
  listSpaces: () => request<{ items: DocSpace[] }>('/docs/spaces'),
  getSpace: (spaceSlug: string) =>
    request<{ space: DocSpace; versions: DocVersion[] }>(`/docs/spaces/${encodeURIComponent(spaceSlug)}`),
  getTree: (spaceSlug: string, version: string) =>
    request<DocTreeResponse>(
      `/docs/${encodeURIComponent(spaceSlug)}/${encodeURIComponent(version)}/tree`,
    ),
  getPage: (spaceSlug: string, version: string, path = '') => {
    const query = new URLSearchParams({ path });
    return request<DocPageResponse>(
      `/docs/${encodeURIComponent(spaceSlug)}/${encodeURIComponent(version)}/page?${query.toString()}`,
    );
  },
  search: (q: string, space?: string) => {
    const query = new URLSearchParams({ q });
    if (space) query.set('space', space);
    return request<{ items: DocSearchItem[] }>(`/docs/search?${query.toString()}`);
  },
  submitFeedback: (documentId: string, helpful: boolean, comment?: string) =>
    request<{ ok: boolean }>(`/docs/documents/${encodeURIComponent(documentId)}/feedback`, {
      method: 'POST',
      headers: { 'x-visitor-id': visitorId() },
      body: JSON.stringify({ helpful, comment: comment || null }),
    }),
};
