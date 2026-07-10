import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, FileText, Folder, Tag, Image, MessageSquare } from 'lucide-react';
import { api } from '../../lib/api';

export function AdminLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const onLogout = async () => {
    try {
      await api.logout();
    } finally {
      qc.setQueryData(['admin', 'me'], null);
      qc.invalidateQueries({ queryKey: ['admin', 'me'] });
      navigate('/admin/login');
    }
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-line bg-surface p-4">
        <div className="mb-6 px-2 font-semibold">NOWEN 后台</div>
        <nav className="space-y-1 text-sm">
          <Link
            to="/admin"
            className="block rounded-lg px-3 py-2 text-muted transition hover:text-fg"
          >
            仪表盘
          </Link>
          <Link
            to="/admin/posts"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted transition hover:text-fg"
          >
            <FileText className="h-4 w-4" />
            文章管理
          </Link>
          <Link
            to="/admin/categories"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted transition hover:text-fg"
          >
            <Folder className="h-4 w-4" />
            分类管理
          </Link>
          <Link
            to="/admin/tags"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted transition hover:text-fg"
          >
            <Tag className="h-4 w-4" />
            标签管理
          </Link>
          <Link
            to="/admin/assets"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted transition hover:text-fg"
          >
            <Image className="h-4 w-4" />
            媒体库
          </Link>
          <Link
            to="/admin/comments"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted transition hover:text-fg"
          >
            <MessageSquare className="h-4 w-4" />
            评论管理
          </Link>
          <Link
            to="/"
            className="block rounded-lg px-3 py-2 text-muted transition hover:text-fg"
          >
            返回前台
          </Link>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-6">
          <span className="text-sm text-muted">管理后台</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm transition hover:border-brand/60"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
