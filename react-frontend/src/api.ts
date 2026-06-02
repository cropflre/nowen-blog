const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, options);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${res.status}`);
  }
  return res.json();
}

// 获取存储的令牌
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// 创建带认证头的请求选项
function createAuthOptions(method: string, body?: unknown): RequestInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return options;
}

export const api = {
  // --- 公开API ---
  getSite: () => fetchJSON<import('./types').SiteInfo>('/api/site'),
  
  getPosts: (params?: { tag?: string; status?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.tag) qs.set('tag', params.tag);
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    return fetchJSON<import('./types').PaginatedResponse<import('./types').Post>>(`/api/posts?${qs}`);
  },
  
  getPost: (slug: string) =>
    fetchJSON<import('./types').Post>(`/api/posts/detail?slug=${slug}`),

  // RESTful 文章查询（带浏览量递增）
  getPublicPost: async (slug: string): Promise<import('./types').Post> => {
    const res = await fetchJSON<{ status: string; data: import('./types').Post }>(`/api/posts/${slug}`);
    return res.data;
  },

  // --- 评论系统 ---
  getComments: (postId: number, page = 1, pageSize = 20) =>
    fetchJSON<{ status: string; data: { comments: import('./types').Comment[]; total: number } }>(
      `/api/posts/${postId}/comments?page=${page}&pageSize=${pageSize}`
    ),

  createComment: (postId: number, data: import('./types').CommentFormData) =>
    fetchJSON<{ status: string; message: string; data: import('./types').Comment }>(
      `/api/posts/${postId}/comments`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
    ),

  // --- 管理员评论 API ---
  adminGetComments: (params?: { status?: string; postId?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.postId) qs.set('postId', params.postId);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    return fetchJSON<{ status: string; data: { comments: import('./types').Comment[]; total: number } }>(
      `/api/admin/comments?${qs}`, createAuthOptions('GET')
    );
  },

  adminGetCommentStats: () =>
    fetchJSON<{ status: string; data: { pending: number; approved: number; rejected: number; total: number } }>(
      '/api/admin/comments/stats', createAuthOptions('GET')
    ),

  adminUpdateCommentStatus: (id: number, status: string) =>
    fetchJSON<{ status: string; data: import('./types').Comment }>(
      `/api/admin/comments/${id}/status`, createAuthOptions('PUT', { status })
    ),

  adminDeleteComment: (id: number) =>
    fetchJSON<{ message: string }>(`/api/admin/comments/${id}`, createAuthOptions('DELETE')),

  // --- 认证API ---
  login: (data: import('./types').LoginRequest) =>
    fetchJSON<import('./types').AuthResponse>('/api/auth/login', createAuthOptions('POST', data)),
  
  register: (data: import('./types').RegisterRequest) =>
    fetchJSON<import('./types').AuthResponse>('/api/auth/register', createAuthOptions('POST', data)),
  
  updatePassword: (data: import('./types').UpdatePasswordRequest) =>
    fetchJSON<{ message: string }>('/api/admin/password', createAuthOptions('PUT', data)),

  updateProfile: (data: import('./types').UpdateProfileRequest) =>
    fetchJSON<{ message: string; token: string; username: string }>('/api/admin/profile', createAuthOptions('PUT', data)),

  getCurrentUser: () =>
    fetchJSON<{ id: number; username: string; email: string; role: string; must_change_password: boolean; created_at: string }>('/api/admin/me', createAuthOptions('GET')),

  // --- 管理员API ---
  adminGetPosts: (params?: { status?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    return fetchJSON<import('./types').PaginatedResponse<import('./types').Post>>(`/api/admin/posts?${qs}`, createAuthOptions('GET'));
  },
  
  adminGetPost: (id: number) =>
    fetchJSON<import('./types').Post>(`/api/admin/posts/detail?id=${id}`, createAuthOptions('GET')),
  
  createPost: (data: import('./types').PostRequest) =>
    fetchJSON<import('./types').Post>('/api/admin/posts', createAuthOptions('POST', data)),
  
  updatePost: (id: number, data: import('./types').PostRequest) =>
    fetchJSON<import('./types').Post>(`/api/admin/posts/${id}`, createAuthOptions('PUT', data)),
  
  deletePost: (id: number) =>
    fetchJSON<{ message: string }>(`/api/admin/posts/${id}`, createAuthOptions('DELETE')),
  
  updateSiteInfo: (data: import('./types').SiteInfo) =>
    fetchJSON<import('./types').SiteInfo>('/api/admin/site', createAuthOptions('PUT', data)),

  getProjects: (params?: { featured?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.featured) qs.set('featured', 'true');
    return fetchJSON<import('./types').Project[]>(`/api/projects?${qs}`);
  },

  // --- 幻灯片 ---
  getCarousel: async (): Promise<import('./types').Post[]> => {
    const res = await fetchJSON<{ status: string; data: import('./types').Post[] }>('/api/carousel');
    return res.data;
  },

  updateCarouselOrder: (id: number, carouselOrder: number) =>
    fetchJSON<{ message: string }>(`/api/admin/posts/${id}/carousel`, createAuthOptions("PUT", { carousel_order: carouselOrder })),

  // --- 统一内容系统 ---
  getContents: (params: { type: 'blog' | 'doc'; project?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    qs.set('type', params.type);
    if (params.project) qs.set('project', params.project);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    return fetchJSON<import('./types').PaginatedResponse<import('./types').Content>>(`/api/contents?${qs}`);
  },

  getContentBySlug: async (slug: string): Promise<import('./types').Content> => {
    const res = await fetchJSON<{ status: string; data: import('./types').Content }>(`/api/contents/${slug}`);
    return res.data;
  },

  getDocTree: async (project: string): Promise<{ project: string; github_url: string; data: import('./types').DocTreeItem[] }> => {
    const res = await fetchJSON<{ status: string; project: string; github_url: string; data: import('./types').DocTreeItem[] }>(`/api/docs/${project}/tree`);
    return res;
  },

  getProjectsList: async (): Promise<import('./types').ProjectInfo[]> => {
    const res = await fetchJSON<{ status: string; data: import('./types').ProjectInfo[] }>('/api/projects/list');
    return res.data;
  },

  // 全局搜索 (Cmd+K)
  searchContents: async (query: string): Promise<import('./types').SearchResult[]> => {
    const res = await fetchJSON<{ status: string; data: import('./types').SearchResult[] }>(`/api/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  // 管理员内容 API
  adminCreateContent: (data: Partial<import('./types').Content>) =>
    fetchJSON<import('./types').Content>('/api/admin/contents', createAuthOptions('POST', data)),

  adminUpdateContent: (id: number, data: Partial<import('./types').Content>) =>
    fetchJSON<import('./types').Content>(`/api/admin/contents/${id}`, createAuthOptions('PUT', data)),

  adminDeleteContent: (id: number) =>
    fetchJSON<{ message: string }>(`/api/admin/contents/${id}`, createAuthOptions('DELETE')),

  // 图片上传 API
  uploadImage: async (file: File): Promise<{ id: number; url: string; filename: string; original: string; markdown: string }> => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`${API_BASE}/api/admin/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Upload failed: ${res.status}`);
    }

    const data = await res.json();
    // 合并 data.data（id, url, filename 等）和顶层 markdown 字段
    return { ...data.data, markdown: data.markdown };
  },

  getImages: (page = 1, pageSize = 20) =>
    fetchJSON<{ data: import('./types').ImageInfo[]; total: number }>(`/api/admin/images?page=${page}&pageSize=${pageSize}`, createAuthOptions('GET')),

  deleteImage: (id: number) =>
    fetchJSON<{ message: string }>(`/api/admin/images/${id}`, createAuthOptions('DELETE')),

  // --- 工具函数 ---
  setAuthToken: (token: string) => {
    localStorage.setItem('auth_token', token);
  },
  
  removeAuthToken: () => {
    localStorage.removeItem('auth_token');
  },
  
  isAuthenticated: () => {
    return !!getAuthToken();
  },

  // ==================== GitHub 项目相关 API ====================
  
  // 通过 URL 获取 GitHub 仓库信息（POST）
  fetchGitHubRepoByURL: (url: string): Promise<import('./types').GitHubProjectResponse> =>
    fetchJSON<import('./types').GitHubProjectResponse>('/api/github/repo-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }),

  // 通过 owner 和 repo 获取 GitHub 仓库信息（GET）
  fetchGitHubRepo: (owner: string, repo: string): Promise<{ success: boolean; data: import('./types').GitHubRepoInfo }> => {
    const qs = new URLSearchParams();
    qs.set('owner', owner);
    qs.set('repo', repo);
    return fetchJSON<{ success: boolean; data: import('./types').GitHubRepoInfo }>(`/api/github/repo-info?${qs}`);
  },

  // 通过完整 URL 获取 GitHub 仓库信息（GET）
  fetchGitHubRepoByURLGet: (url: string): Promise<{ success: boolean; data: import('./types').GitHubRepoInfo }> => {
    const qs = new URLSearchParams();
    qs.set('url', url);
    return fetchJSON<{ success: boolean; data: import('./types').GitHubRepoInfo }>(`/api/github/repo-info?${qs}`);
  },
};





