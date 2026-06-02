const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, options);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${res.status}`);
  }
  return res.json();
}

// 鑾峰彇瀛樺偍鐨勪护鐗?
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// 鍒涘缓甯﹁璇佸ご鐨勮姹傞€夐」
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
  // --- 鍏紑API ---
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

  // RESTful 鏂囩珷鏌ヨ锛堝甫娴忚閲忛€掑锛?
  getPublicPost: async (slug: string): Promise<import('./types').Post> => {
    const res = await fetchJSON<{ status: string; data: import('./types').Post }>(`/api/posts/${slug}`);
    return res.data;
  },

  // --- 璇勮绯荤粺 ---
  getComments: (postId: number, page = 1, pageSize = 20) =>
    fetchJSON<{ status: string; data: { comments: import('./types').Comment[]; total: number } }>(
      `/api/posts/${postId}/comments?page=${page}&pageSize=${pageSize}`
    ),

  createComment: (postId: number, data: import('./types').CommentFormData) =>
    fetchJSON<{ status: string; message: string; data: import('./types').Comment }>(
      `/api/posts/${postId}/comments`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
    ),

  // --- 绠＄悊鍛樿瘎璁?API ---
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

  // --- 璁よ瘉API ---
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

  // --- 绠＄悊鍛楢PI ---
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

  // --- 骞荤伅鐗?---
  getCarousel: async (): Promise<import('./types').Post[]> => {
    const res = await fetchJSON<{ status: string; data: import('./types').Post[] }>('/api/carousel');
    return res.data;
  },

  updateCarouselOrder: (id: number, carouselOrder: number) =>
    fetchJSON<{ message: string }>(`/api/admin/posts/${id}/carousel`, createAuthOptions("PUT", { carousel_order: carouselOrder })),

  // --- 缁熶竴鍐呭绯荤粺 ---
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

  // 鍏ㄥ眬鎼滅储 (Cmd+K)
  searchContents: async (query: string): Promise<import('./types').SearchResult[]> => {
    const res = await fetchJSON<{ status: string; data: import('./types').SearchResult[] }>(`/api/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  // 绠＄悊鍛樺唴瀹?API
  adminCreateContent: (data: Partial<import('./types').Content>) =>
    fetchJSON<import('./types').Content>('/api/admin/contents', createAuthOptions('POST', data)),

  adminUpdateContent: (id: number, data: Partial<import('./types').Content>) =>
    fetchJSON<import('./types').Content>(`/api/admin/contents/${id}`, createAuthOptions('PUT', data)),

  adminDeleteContent: (id: number) =>
    fetchJSON<{ message: string }>(`/api/admin/contents/${id}`, createAuthOptions('DELETE')),

  // 鍥剧墖涓婁紶 API
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
    // 鍚堝苟 data.data锛坕d, url, filename 绛夛級鍜岄《灞?markdown 瀛楁
    return { ...data.data, markdown: data.markdown };
  },

  getImages: (page = 1, pageSize = 20) =>
    fetchJSON<{ data: import('./types').ImageInfo[]; total: number }>(`/api/admin/images?page=${page}&pageSize=${pageSize}`, createAuthOptions('GET')),

  deleteImage: (id: number) =>
    fetchJSON<{ message: string }>(`/api/admin/images/${id}`, createAuthOptions('DELETE')),

  // --- 宸ュ叿鍑芥暟 ---
  setAuthToken: (token: string) => {
    localStorage.setItem('auth_token', token);
  },
  
  removeAuthToken: () => {
    localStorage.removeItem('auth_token');
  },
  
  isAuthenticated: () => {
    return !!getAuthToken();
  },

  // ==================== GitHub 椤圭洰鐩稿叧 API ====================
  
  // 閫氳繃 URL 鑾峰彇 GitHub 浠撳簱淇℃伅锛圥OST锛?
  fetchGitHubRepoByURL: (url: string): Promise<import('./types').GitHubProjectResponse> =>
    fetchJSON<import('./types').GitHubProjectResponse>('/api/github/repo-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }),

  // 閫氳繃 owner 鍜?repo 鑾峰彇 GitHub 浠撳簱淇℃伅锛圙ET锛?
  fetchGitHubRepo: (owner: string, repo: string): Promise<{ success: boolean; data: import('./types').GitHubRepoInfo }> => {
    const qs = new URLSearchParams();
    qs.set('owner', owner);
    qs.set('repo', repo);
    return fetchJSON<{ success: boolean; data: import('./types').GitHubRepoInfo }>(`/api/github/repo-info?${qs}`);
  },

  // 閫氳繃瀹屾暣 URL 鑾峰彇 GitHub 浠撳簱淇℃伅锛圙ET锛?
  fetchGitHubRepoByURLGet: (url: string): Promise<{ success: boolean; data: import('./types').GitHubRepoInfo }> => {
    const qs = new URLSearchParams();
    qs.set('url', url);
    return fetchJSON<{ success: boolean; data: import('./types').GitHubRepoInfo }>(`/api/github/repo-info?${qs}`);
  },
};





