import type { Project } from '@blog/shared';

export interface ProjectInput {
  name: string;
  slug?: string;
  description?: string | null;
  coverUrl?: string | null;
  repositoryUrl?: string | null;
  homepageUrl?: string | null;
  language?: string | null;
  topics?: string[];
  isFeatured?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
}

export interface GitHubSyncResult {
  targetType: 'repository' | 'owner';
  items: Project[];
  synced: number;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: 'active' | 'unsubscribed';
  source: string;
  subscribedAt: string;
  unsubscribedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterCampaign {
  id: string;
  postId: string | null;
  postTitle: string | null;
  subject: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: 'pending' | 'sending' | 'completed' | 'partial' | 'failed' | string;
  providerMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface NewsletterAdminResult {
  items: NewsletterSubscriber[];
  total: number;
  page: number;
  pageSize: number;
  stats: {
    active: number;
    unsubscribed: number;
    total: number;
  };
  campaigns: NewsletterCampaign[];
  providerConfigured: boolean;
}
