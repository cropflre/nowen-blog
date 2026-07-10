import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CalendarDays,
  Eye,
  FilePlus2,
  FileText,
  MessageSquare,
  Tags,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from '../../lib/api';

const numberFormatter = new Intl.NumberFormat('zh-CN');

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatDate(value: string | null): string {
  if (!value) return '尚未产生访问数据';
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

function shortDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-fg">{formatNumber(value)}</p>
        </div>
        <div className="rounded-xl border border-brand/20 bg-brand/10 p-2.5 text-brand">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">{hint}</p>
    </div>
  );
}

export function Dashboard() {
  const meQuery = useQuery({ queryKey: ['admin', 'me'], queryFn: api.getMe });
  const statsQuery = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: api.getDashboardStats,
    refetchInterval: 60_000,
  });

  const stats = statsQuery.data;
  const maxTrendViews = Math.max(1, ...(stats?.trend.map((item) => item.views) ?? [1]));

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-brand" />
            <h1 className="text-2xl font-bold">数据仪表盘</h1>
          </div>
          <p className="mt-2 text-sm text-muted">
            欢迎，{meQuery.data?.user.username ?? '管理员'}
            {meQuery.data?.user.role && (
              <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs">
                {meQuery.data.user.role}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/posts/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            <FilePlus2 className="h-4 w-4" />
            新建文章
          </Link>
          <Link
            to="/admin/comments"
            className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm text-muted transition hover:border-brand/60 hover:text-fg"
          >
            <MessageSquare className="h-4 w-4" />
            审核评论
          </Link>
        </div>
      </section>

      {statsQuery.isLoading ? (
        <div className="rounded-card border border-line bg-surface px-6 py-20 text-center text-muted">
          正在加载统计数据…
        </div>
      ) : statsQuery.isError || !stats ? (
        <div className="rounded-card border border-red-500/30 bg-red-500/10 px-6 py-12 text-center text-red-400">
          统计数据加载失败：
          {statsQuery.error instanceof Error ? statsQuery.error.message : '未知错误'}
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <StatCard
              label="累计阅读"
              value={stats.summary.totalViews}
              hint="保留历史累计，今后仅真实访问增加"
              icon={Eye}
            />
            <StatCard
              label="真实访问记录"
              value={stats.summary.trackedViews}
              hint={`${formatNumber(stats.summary.uniqueVisitors)} 位匿名访客`}
              icon={Users}
            />
            <StatCard
              label="今日访问"
              value={stats.summary.viewsToday}
              hint="按 UTC 自然日统计"
              icon={CalendarDays}
            />
            <StatCard
              label="近 7 日访问"
              value={stats.summary.viewsLast7Days}
              hint="去重后的有效页面访问"
              icon={TrendingUp}
            />
            <StatCard
              label="已发布文章"
              value={stats.summary.publishedPosts}
              hint={`${formatNumber(stats.summary.draftPosts)} 篇草稿`}
              icon={FileText}
            />
            <StatCard
              label="待审核评论"
              value={stats.summary.pendingComments}
              hint={`${formatNumber(stats.summary.approvedComments)} 条已通过`}
              icon={MessageSquare}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
            <div className="rounded-card border border-line bg-surface p-5 lg:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">近 14 日访问趋势</h2>
                  <p className="mt-1 text-sm text-muted">柱形表示有效访问，数字为每日独立访客。</p>
                </div>
                <div className="text-right text-xs text-muted">
                  <p>统计开始</p>
                  <p className="mt-1 text-fg/80">{formatDate(stats.trackingStartedAt)}</p>
                </div>
              </div>

              <div className="mt-8 flex h-64 items-end gap-2 border-b border-line/80 pb-2">
                {stats.trend.map((item) => {
                  const height = item.views === 0 ? 3 : Math.max(8, (item.views / maxTrendViews) * 100);
                  return (
                    <div key={item.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                      <div className="relative flex h-48 w-full items-end justify-center">
                        <div
                          className="w-full max-w-8 rounded-t-md bg-brand/75 transition group-hover:bg-brand"
                          style={{ height: `${height}%` }}
                          title={`${item.date}：${item.views} 次访问，${item.visitors} 位访客`}
                        />
                        <div className="pointer-events-none absolute -top-7 hidden whitespace-nowrap rounded bg-fg px-2 py-1 text-[10px] text-bg shadow group-hover:block">
                          {item.views} / {item.visitors} UV
                        </div>
                      </div>
                      <span className="text-[10px] text-muted">{shortDate(item.date)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-card border border-line bg-surface p-5 lg:p-6">
              <h2 className="text-lg font-semibold">内容概览</h2>
              <p className="mt-1 text-sm text-muted">快速进入常用管理模块。</p>
              <div className="mt-5 space-y-3">
                <Link
                  to="/admin/posts"
                  className="flex items-center justify-between rounded-xl border border-line p-4 transition hover:border-brand/60"
                >
                  <span className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-brand" />
                    <span>
                      <span className="block text-sm font-medium">文章管理</span>
                      <span className="mt-0.5 block text-xs text-muted">发布、编辑与维护内容</span>
                    </span>
                  </span>
                  <span className="text-sm text-muted">{stats.summary.publishedPosts}</span>
                </Link>
                <Link
                  to="/admin/comments"
                  className="flex items-center justify-between rounded-xl border border-line p-4 transition hover:border-brand/60"
                >
                  <span className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-brand" />
                    <span>
                      <span className="block text-sm font-medium">评论管理</span>
                      <span className="mt-0.5 block text-xs text-muted">审核与处理读者反馈</span>
                    </span>
                  </span>
                  <span className="text-sm text-muted">{stats.summary.pendingComments}</span>
                </Link>
                <Link
                  to="/admin/categories"
                  className="flex items-center gap-3 rounded-xl border border-line p-4 transition hover:border-brand/60"
                >
                  <Tags className="h-5 w-5 text-brand" />
                  <span>
                    <span className="block text-sm font-medium">分类与标签</span>
                    <span className="mt-0.5 block text-xs text-muted">整理内容结构和专题</span>
                  </span>
                </Link>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-card border border-line bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 lg:px-6">
              <div>
                <h2 className="text-lg font-semibold">热门文章</h2>
                <p className="mt-1 text-sm text-muted">按累计阅读量排序，真实访问数据从本次上线后开始沉淀。</p>
              </div>
              <Link to="/admin/posts" className="text-sm text-brand hover:underline">
                查看全部文章
              </Link>
            </div>

            {stats.topPosts.length === 0 ? (
              <div className="px-6 py-14 text-center text-sm text-muted">暂无已发布文章。</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-bg/50 text-xs text-muted">
                    <tr>
                      <th className="px-6 py-3 font-medium">排名</th>
                      <th className="px-4 py-3 font-medium">文章</th>
                      <th className="px-4 py-3 text-right font-medium">累计阅读</th>
                      <th className="px-4 py-3 text-right font-medium">真实访问</th>
                      <th className="px-4 py-3 text-right font-medium">独立访客</th>
                      <th className="px-6 py-3 text-right font-medium">最近访问</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {stats.topPosts.map((post, index) => (
                      <tr key={post.id} className="transition hover:bg-bg/40">
                        <td className="px-6 py-4 text-muted">#{index + 1}</td>
                        <td className="px-4 py-4">
                          <a
                            href={`/posts/${post.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-fg hover:text-brand"
                          >
                            {post.title}
                          </a>
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums">{formatNumber(post.viewCount)}</td>
                        <td className="px-4 py-4 text-right tabular-nums">{formatNumber(post.trackedViews)}</td>
                        <td className="px-4 py-4 text-right tabular-nums">{formatNumber(post.uniqueVisitors)}</td>
                        <td className="px-6 py-4 text-right text-xs text-muted">
                          {post.lastViewedAt ? formatDate(post.lastViewedAt) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-center text-xs text-muted">
            数据每分钟自动刷新 · 最近生成于 {formatDate(stats.generatedAt)}
          </p>
        </>
      )}
    </div>
  );
}
