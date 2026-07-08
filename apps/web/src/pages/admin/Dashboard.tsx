import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Folder, Tag } from 'lucide-react';
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
        <Link
          to="/admin/posts/new"
          className="flex items-start gap-3 rounded-card border border-line bg-surface p-5 transition hover:border-brand/60"
        >
          <FileText className="mt-0.5 h-5 w-5 text-brand" />
          <div>
            <p className="text-sm text-muted">写文章</p>
            <p className="mt-1 text-lg font-semibold">新建文章</p>
          </div>
        </Link>
        <Link
          to="/admin/categories"
          className="flex items-start gap-3 rounded-card border border-line bg-surface p-5 transition hover:border-brand/60"
        >
          <Folder className="mt-0.5 h-5 w-5 text-brand" />
          <div>
            <p className="text-sm text-muted">分类管理</p>
            <p className="mt-1 text-lg font-semibold">维护分类</p>
          </div>
        </Link>
        <Link
          to="/admin/tags"
          className="flex items-start gap-3 rounded-card border border-line bg-surface p-5 transition hover:border-brand/60"
        >
          <Tag className="mt-0.5 h-5 w-5 text-brand" />
          <div>
            <p className="text-sm text-muted">标签管理</p>
            <p className="mt-1 text-lg font-semibold">维护标签</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
