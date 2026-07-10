import { z } from 'zod';

export const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email('邮箱格式不正确').max(254),
  source: z.string().trim().max(60).optional().default('homepage'),
  website: z.string().max(0).optional().default(''),
});

export const unsubscribeSchema = z.object({
  token: z.string().trim().min(20).max(1000),
});

export const subscriberListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  status: z.enum(['all', 'active', 'unsubscribed']).default('all'),
});

export const sendPostNewsletterSchema = z.object({
  postId: z.string().trim().min(1),
  subject: z.string().trim().min(1).max(160).optional(),
});

export type SubscriberListInput = z.infer<typeof subscriberListSchema>;
