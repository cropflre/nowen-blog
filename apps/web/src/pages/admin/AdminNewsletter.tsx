import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Mail, MailX, RefreshCw, Send, Trash2, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { newsletterApi } from '../../lib/blog19Api';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function AdminNewsletter() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [postId, setPostId] = useState('');
  const [subject, setSubject] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'newsletter', status, page],
    queryFn: () => newsletterApi.listAdmin({ page, pageSize: 30, status }),
  });
  const posts = useQuery({
    queryKey: ['admin', 'newsletter', 'published-posts'],
    queryFn: () => api.listAdminPosts({ page: 1, pageSize: 100, status: 'published' }),
  });

  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / (query.data?.pageSize ?? 30)));
  const selectedPost = useMemo(() => posts.data?.items.find((item) => item.id === postId), [postId, posts.data?.items]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'newsletter'] });
  };

  const act = async (key: string, action: () => Promise<unknown>, success: string) => {
    if (pending) return;
    setPending(key);
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(success);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '操作失败');
    } finally {
      setPending(null);
    }
  };

  const sendPost = async () => {
    if (!postId || pending) return;
    setPending('send');
    setError(null);
    setMessage(null);
    try {
      const campaign = await newsletterApi.sendPost(postId, subject);
      setMessage(`发送完成：成功 ${campaign.sentCount}，失败 ${campaign.failedCount}。`);
      setSubject('');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '邮件发送失败');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header>
        <div className="flex items-center gap-2"><Mail className="h-6 w-6 text-brand" /><h1 className="text-2xl font-bold">邮件订阅</h1></div>
        <p className="mt-2 text-sm text-muted">管理订阅者，并向已发布文章发送更新通知。</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-line bg-surface p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted">全部订阅</p><Users className="h-4 w-4 text-brand" /></div><p className="mt-2 text-2xl font-bold">{query.data?.stats.total ?? 0}</p></div>
        <div className="rounded-card border border-line bg-surface p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted">有效订阅</p><CheckCircle2 className="h-4 w-4 text-emerald-500" /></div><p className="mt-2 text-2xl font-bold">{query.data?.stats.active ?? 0}</p></div>
        <div className="rounded-card border border-line bg-surface p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted">已退订</p><MailX className="h-4 w-4 text-amber-500" /></div><p className="mt-2 text-2xl font-bold">{query.data?.stats.unsubscribed ?? 0}</p></div>
      </div>

      {message && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">{message}</div>}
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}

      <section className="rounded-card border border-line bg-surface p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="flex items-center gap-2 font-semibold"><Send className="h-4 w-4 text-brand" />发送文章通知</h2><p className="mt-1 text-sm text-muted">只会发送给当前状态为“有效”的订阅者。</p></div>
          <span className={`rounded-full px-2.5 py-1 text-xs ${query.data?.providerConfigured ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{query.data?.providerConfigured ? '邮件服务已配置' : '未配置邮件服务'}</span>
        </div>
        {!query.data?.providerConfigured && <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-500">请在服务端配置 RESEND_API_KEY 和 NEWSLETTER_FROM_EMAIL 后发送。</p>}
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <select value={postId} onChange={(event) => { setPostId(event.target.value); setSubject(''); }} className="rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand/70">
            <option value="">选择已发布文章</option>
            {(posts.data?.items ?? []).map((post) => <option key={post.id} value={post.id}>{post.title}</option>)}
          </select>
          <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={selectedPost ? `新文章：${selectedPost.title}` : '邮件主题（可选）'} className="rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand/70" />
          <button type="button" onClick={() => void sendPost()} disabled={!postId || pending === 'send' || !query.data?.providerConfigured} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
            {pending === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}发送通知
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="font-semibold">订阅者</h2>
          <div className="flex items-center gap-2">
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-lg border border-line bg-bg px-3 py-2 text-sm">
              <option value="all">全部状态</option><option value="active">有效</option><option value="unsubscribed">已退订</option>
            </select>
            <button type="button" onClick={() => void refresh()} className="rounded-lg border border-line p-2 text-muted hover:text-fg" aria-label="刷新"><RefreshCw className="h-4 w-4" /></button>
          </div>
        </div>
        {query.isLoading ? <div className="p-10 text-center text-muted">正在加载订阅者…</div> : (query.data?.items.length ?? 0) === 0 ? <div className="p-10 text-center text-muted">暂无订阅记录。</div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-bg/50 text-xs text-muted"><tr><th className="px-5 py-3">邮箱</th><th className="px-5 py-3">状态</th><th className="px-5 py-3">来源</th><th className="px-5 py-3">订阅时间</th><th className="px-5 py-3 text-right">操作</th></tr></thead>
              <tbody className="divide-y divide-line">
                {(query.data?.items ?? []).map((subscriber) => (
                  <tr key={subscriber.id}>
                    <td className="px-5 py-4 font-medium">{subscriber.email}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs ${subscriber.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{subscriber.status === 'active' ? '有效' : '已退订'}</span></td>
                    <td className="px-5 py-4 text-muted">{subscriber.source}</td>
                    <td className="px-5 py-4 text-muted">{formatDate(subscriber.subscribedAt)}</td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-2">{subscriber.status === 'active' ? <button type="button" onClick={() => void act(`unsubscribe-${subscriber.id}`, () => newsletterApi.unsubscribeAdmin(subscriber.id), '订阅者已停用。')} className="rounded-lg border border-line px-3 py-1.5 text-xs">停用</button> : <button type="button" onClick={() => void act(`activate-${subscriber.id}`, () => newsletterApi.activate(subscriber.id), '订阅者已重新启用。')} className="rounded-lg border border-line px-3 py-1.5 text-xs">重新启用</button>}<button type="button" onClick={() => { if (window.confirm(`确定永久删除 ${subscriber.email} 吗？`)) void act(`delete-${subscriber.id}`, () => newsletterApi.remove(subscriber.id), '订阅记录已删除。'); }} className="rounded-lg border border-red-500/30 p-1.5 text-red-500"><Trash2 className="h-4 w-4" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-line px-5 py-4 text-sm text-muted"><span>第 {page} / {totalPages} 页</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">上一页</button><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">下一页</button></div></div>
      </section>

      <section className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="border-b border-line px-5 py-4"><h2 className="font-semibold">最近发送</h2></div>
        {(query.data?.campaigns.length ?? 0) === 0 ? <div className="p-8 text-center text-sm text-muted">暂无发送记录。</div> : <div className="divide-y divide-line">{(query.data?.campaigns ?? []).map((campaign) => <div key={campaign.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"><div><p className="font-medium">{campaign.subject}</p><p className="mt-1 text-xs text-muted">{campaign.postTitle || '文章已删除'} · {formatDate(campaign.sentAt || campaign.createdAt)}</p>{campaign.providerMessage && <p className="mt-1 text-xs text-red-500">{campaign.providerMessage}</p>}</div><div className="flex items-center gap-3 text-xs"><span className="text-muted">收件人 {campaign.recipientCount}</span><span className="text-emerald-500">成功 {campaign.sentCount}</span><span className="text-red-500">失败 {campaign.failedCount}</span><span className="rounded-full border border-line px-2 py-1">{campaign.status}</span></div></div>)}</div>}
      </section>
    </div>
  );
}
