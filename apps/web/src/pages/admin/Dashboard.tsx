import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Image, MessageSquare } from 'lucide-react';
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
          to="/admin/posts"
          className="flex items-start gap-3 rounded-card border border-line bg-surface p-5 transition hover:border-brand/60"
        >
          <FileText className="mt-0.5 h-5 w-5 text-brand" />
          <div>
            <p className="text-sm text-muted">文章管理</p>
            <p className="mt-1 text-lg font-semibold">写文章 / 发布</p>
          </div>
        </Link>
        <div className="flex items-start gap-3 rounded-card border border-line bg-surface p-5">
          <Image className="mt-0.5 h-5 w-5 text-muted" />
          <div>
            <p className="text-sm text-muted">媒体库</p>
            <p className="mt-1 text-lg font-semibold">后续阶段</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-card border border-line bg-surface p-5">
          <MessageSquare className="mt-0.5 h-5 w-5 text-muted" />
          <div>
            <p className="text-sm text-muted">评论管理</p>
            <p className="mt-1 text-lg font-semibold">后续阶段</p>
          </div>
        </div>
      </div>
    </div>
  );
}
