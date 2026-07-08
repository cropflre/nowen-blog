import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function Dashboard() {
  const { data } = useQuery({ queryKey: ['admin', 'me'], queryFn: api.getMe });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">仪表盘</h1>
      <p className="mt-2 text-muted">
        欢迎，{data?.user.username}
        <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs">
          {data?.user.role}
        </span>
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-card border border-line bg-surface p-5">
          <p className="text-sm text-muted">文章管理</p>
          <p className="mt-1 text-lg font-semibold">即将在 BLOG-07 实现</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-5">
          <p className="text-sm text-muted">媒体库</p>
          <p className="mt-1 text-lg font-semibold">后续阶段</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-5">
          <p className="text-sm text-muted">评论管理</p>
          <p className="mt-1 text-lg font-semibold">后续阶段</p>
        </div>
      </div>
    </div>
  );
}
