import { z } from 'zod';

// 评论状态枚举
export const COMMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SPAM: 'spam',
} as const;

export type CommentStatus = (typeof COMMENT_STATUS)[keyof typeof COMMENT_STATUS];

// 公开评论提交输入
export const commentCreateSchema = z.object({
  authorName: z.string().min(2).max(40).regex(/^[^<>'"]+$/, '昵称不能包含特殊字符'),
  authorEmail: z.string().email('邮箱格式不正确'),
  authorWebsite: z.string().url('网站格式不正确').refine(
    (url) => !url || url.startsWith('http://') || url.startsWith('https://'),
    '网站地址必须以 http:// 或 https:// 开头'
  ).optional().or(z.literal('')),
  content: z.string().min(10).max(2000, '评论内容需在 10-2000 字符之间'),
});

export type CommentCreateInput = z.infer<typeof commentCreateSchema>;

// 后台评论更新输入
export const commentUpdateSchema = z.object({
  authorName: z.string().min(2).max(40).optional(),
  authorEmail: z.string().email().optional(),
  authorWebsite: z.string().url().refine(
    (url) => !url || url.startsWith('http://') || url.startsWith('https://'),
    '网站地址必须以 http:// 或 https:// 开头'
  ).optional().or(z.literal('')),
  content: z.string().min(10).max(2000).optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'spam']).optional(),
});

export type CommentUpdateInput = z.infer<typeof commentUpdateSchema>;

// 评论列表查询参数
export const commentListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(20),
  status: z.enum(['pending', 'approved', 'rejected', 'spam']).optional(),
  postId: z.string().optional(),
  postSlug: z.string().optional(),
});

export type CommentListQuery = z.infer<typeof commentListQuerySchema>;

// 公开评论视图（不含敏感字段）
export const publicCommentSchema = z.object({
  id: z.string(),
  authorName: z.string(),
  authorWebsite: z.string().nullable(),
  content: z.string(),
  createdAt: z.string(),
  approvedAt: z.string().nullable(),
});

export type PublicCommentView = z.infer<typeof publicCommentSchema>;

// 后台评论视图（含敏感字段）
export const adminCommentSchema = z.object({
  id: z.string(),
  postId: z.string(),
  postTitle: z.string().optional(),
  authorName: z.string(),
  authorEmail: z.string(),
  authorWebsite: z.string().nullable(),
  content: z.string(),
  status: z.string(),
  ipHash: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  approvedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
});

export type AdminCommentView = z.infer<typeof adminCommentSchema>;
