import { eq, desc, asc, and, isNull, isNotNull, count } from 'drizzle-orm';
import { db } from '../../db/client';
import { comments, posts } from '../../db/schema';
import { randomId, nowIso } from '../../lib/format';
import { CommentCreateInput, CommentUpdateInput, PublicCommentView, AdminCommentView } from './comments.schema';
import { createHash } from 'node:crypto';

// 简单内存频率限制（生产环境建议使用 Redis）
const submitHistory = new Map<string, number[]>();

// IP 哈希（不明文存储 IP）
export function hashIp(ip: string): string {
  const salt = process.env.IP_SALT || 'nowen-blog-comments-salt';
  return createHash('sha256').update(ip + salt).digest('hex').substring(0, 16);
}

// 检查频率限制（同一 ipHash 1 分钟内最多 5 次）
export function checkRateLimit(ipHash: string): boolean {
  const now = Date.now();
  const history = submitHistory.get(ipHash) || [];

  // 清除 1 分钟前的记录
  const recent = history.filter((ts) => now - ts < 60 * 1000);

  if (recent.length >= 5) {
    return false; // 触发频率限制
  }

  recent.push(now);
  submitHistory.set(ipHash, recent);
  return true; // 通过频率限制
}

// 转义 HTML（防止 XSS）
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 创建评论（公开接口）
export async function createComment(input: CommentCreateInput & { postSlug: string }, ip?: string, userAgent?: string): Promise<{ id: string; status: string }> {
  // 频率限制
  if (ip) {
    const ipHash = hashIp(ip);
    if (!checkRateLimit(ipHash)) {
      throw new Error('提交过于频繁，请稍后再试');
    }
  }

  // 查找文章（通过 slug）
  const post = await db.query.posts.findFirst({
    where: and(eq(posts.slug, input.postSlug), eq(posts.status, 'published'), eq(posts.visibility, 'public')),
  });

  if (!post) {
    throw new Error('文章不存在或不可评论');
  }

  const now = nowIso();
  const id = randomId('c_');
  const ipHash = ip ? hashIp(ip) : null;

  // 转义评论内容（防止 XSS）
  const escapedContent = escapeHtml(input.content);

  await db
    .insert(comments)
    .values({
      id,
      postId: post.id,
      authorName: input.authorName,
      authorEmail: input.authorEmail,
      authorWebsite: input.authorWebsite || null,
      content: escapedContent,
      status: 'pending',
      ipHash,
      userAgent: userAgent ? userAgent.substring(0, 500) : null, // 限制长度
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return { id, status: 'pending' };
}

// 获取文章的公开评论列表（只返回 approved）
export async function getPublicComments(postSlug: string, page: number, pageSize: number): Promise<{ items: PublicCommentView[]; total: number; page: number; pageSize: number }> {
  // 查找文章
  const post = await db.query.posts.findFirst({
    where: and(eq(posts.slug, postSlug), eq(posts.status, 'published'), eq(posts.visibility, 'public')),
  });

  if (!post) {
    throw new Error('文章不存在');
  }

  const offset = (page - 1) * pageSize;

  // 查询 approved 且未删除的评论
  const rows = await db.query.comments.findMany({
    where: and(eq(comments.postId, post.id), eq(comments.status, 'approved'), isNull(comments.deletedAt)),
    orderBy: [asc(comments.createdAt)], // 按创建时间升序
    limit: pageSize,
    offset,
  });

  const [{ total }] = await db.select({ total: count() }).from(comments).where(and(eq(comments.postId, post.id), eq(comments.status, 'approved'), isNull(comments.deletedAt)));

  const items: PublicCommentView[] = rows.map((row) => ({
    id: row.id,
    authorName: row.authorName,
    authorWebsite: row.authorWebsite,
    content: row.content, // 已转义
    createdAt: row.createdAt,
    approvedAt: row.approvedAt,
  }));

  return { items, total, page, pageSize };
}

// 获取后台评论列表（可按状态筛选）
export async function getAdminComments(query: { page: number; pageSize: number; status?: string; postId?: string; postSlug?: string }): Promise<{ items: AdminCommentView[]; total: number; page: number; pageSize: number }> {
  const offset = (query.page - 1) * query.pageSize;

  // 构建查询条件
  const conditions = [isNull(comments.deletedAt)]; // 不显示已软删除的

  if (query.status) {
    conditions.push(eq(comments.status, query.status));
  }

  if (query.postId) {
    conditions.push(eq(comments.postId, query.postId));
  }

  if (query.postSlug) {
    const post = await db.query.posts.findFirst({
      where: eq(posts.slug, query.postSlug),
    });
    if (post) {
      conditions.push(eq(comments.postId, post.id));
    }
  }

  const rows = await db.query.comments.findMany({
    where: and(...conditions),
    orderBy: [desc(comments.createdAt)], // 后台按创建时间降序
    limit: query.pageSize,
    offset,
  });

  // 获取文章标题
  const postIds = [...new Set(rows.map((r) => r.postId))];
  const postList = await db.query.posts.findMany({
    where: postIds.length > 0 ? undefined : undefined, // 简化：如果 postIds 为空则不查询
  });
  const postMap = new Map(postList.map((p) => [p.id, p.title]));

  const [{ total }] = await db.select({ total: count() }).from(comments).where(and(...conditions));

  const items: AdminCommentView[] = rows.map((row) => ({
    id: row.id,
    postId: row.postId,
    postTitle: postMap.get(row.postId),
    authorName: row.authorName,
    authorEmail: row.authorEmail,
    authorWebsite: row.authorWebsite,
    content: row.content,
    status: row.status,
    ipHash: row.ipHash,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    approvedAt: row.approvedAt,
    deletedAt: row.deletedAt,
  }));

  return { items, total, page: query.page, pageSize: query.pageSize };
}

// 获取单条评论详情（后台）
export async function getCommentById(id: string): Promise<AdminCommentView | null> {
  const row = await db.query.comments.findFirst({
    where: and(eq(comments.id, id), isNull(comments.deletedAt)),
  });

  if (!row) return null;

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, row.postId),
  });

  return {
    id: row.id,
    postId: row.postId,
    postTitle: post?.title,
    authorName: row.authorName,
    authorEmail: row.authorEmail,
    authorWebsite: row.authorWebsite,
    content: row.content,
    status: row.status,
    ipHash: row.ipHash,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    approvedAt: row.approvedAt,
    deletedAt: row.deletedAt,
  };
}

// 更新评论（后台）
export async function updateComment(id: string, input: CommentUpdateInput): Promise<AdminCommentView | null> {
  const existing = await getCommentById(id);
  if (!existing) return null;

  const patch: any = { updatedAt: nowIso() };

  if (input.authorName !== undefined) patch.authorName = input.authorName;
  if (input.authorEmail !== undefined) patch.authorEmail = input.authorEmail;
  if (input.authorWebsite !== undefined) patch.authorWebsite = input.authorWebsite || null;
  if (input.content !== undefined) patch.content = escapeHtml(input.content);
  if (input.status !== undefined) patch.status = input.status;

  await db.update(comments).set(patch).where(eq(comments.id, id)).run();

  return getCommentById(id);
}

// 批准评论
export async function approveComment(id: string): Promise<AdminCommentView | null> {
  const existing = await getCommentById(id);
  if (!existing) return null;

  await db
    .update(comments)
    .set({
      status: 'approved',
      approvedAt: nowIso(),
      updatedAt: nowIso(),
    })
    .where(eq(comments.id, id))
    .run();

  return getCommentById(id);
}

// 拒绝评论
export async function rejectComment(id: string): Promise<AdminCommentView | null> {
  const existing = await getCommentById(id);
  if (!existing) return null;

  await db
    .update(comments)
    .set({
      status: 'rejected',
      updatedAt: nowIso(),
    })
    .where(eq(comments.id, id))
    .run();

  return getCommentById(id);
}

// 标记为垃圾评论
export async function markAsSpam(id: string): Promise<AdminCommentView | null> {
  const existing = await getCommentById(id);
  if (!existing) return null;

  await db
    .update(comments)
    .set({
      status: 'spam',
      updatedAt: nowIso(),
    })
    .where(eq(comments.id, id))
    .run();

  return getCommentById(id);
}

// 软删除评论
export async function deleteComment(id: string): Promise<boolean> {
  const existing = await getCommentById(id);
  if (!existing) return false;

  // 软删除：设置 deletedAt
  await db
    .update(comments)
    .set({
      deletedAt: nowIso(),
      updatedAt: nowIso(),
    })
    .where(eq(comments.id, id))
    .run();

  return true;
}
