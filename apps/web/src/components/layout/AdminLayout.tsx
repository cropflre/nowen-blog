import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  LogOut,
  FileText,
  BookOpen,
  Folder,
  Tag,
  Image,
  MessageSquare,
  Settings,
  FolderGit2,
  Mail,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import { ThemeToggle } from '../ui/ThemeToggle';

export function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const onLogout = async () => {
    try {
      await api.logout();
    } finally {
      queryClient.setQueryData(['admin', 'me'], null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'me'] });
      navigate('/admin/login');
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <aside className="w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-glass-strong)] p-4 backdrop-blur-xl">
        <div className="mb-6 px-2 font-semibold">NOWEN 后台</div>
        <nav className="space-y-1 text-sm" aria-label="后台导航">
          <Link to="/admin" className="block rounded-lg px-3 py-2 text-muted transition hover:bg-[var(--color-glass-hover)] hover:text-fg">仪表盘</Link>
          <Link to="/admin/posts" className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted transition hover:bg-[var(--color-glass-hover)] hover:text-fg"><FileText className="h-4 w-4" />文章管理</Link>
          <Link to="/admin/docs" className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-muted transition hover:border-[color-mix(in_srgb,var(--color-primary)_20%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] hover:text-fg"><BookOpen className="h-4 w-4 text-[var(--color-primary)]" />帮助中心</Link>
          <Link to="/admin/ai" className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-muted transition hover:border-violet-500/20 hover:bg-gradient-to-r hover:from-violet-500/10 hover:to-cyan-500/5 hover:text-fg"><Sparkles className="h-4 w-4 text-violet-500" />AI 写作</Link>
          <Link to="/admin/projects" className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted transition hover:bg-[var(--color-glass-hover)] hover:text-fg"><FolderGit2 className="h-4 w-4" />项目管理</Link>
          <Link to="/admin/categories" className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted transition hover:bg-[var(--color-glass-hover)] hover:text-fg"><Folder className="h-4 w-4" />分类管理</Link>
          <Link to="/admin/tags" className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted transition hover:bg-[var(--color-glass-hover)] hover:text-fg"><Tag className="h-4 w-4" />标签管理</Link>
          <Link to="/admin/assets" className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted transition hover:bg-[var(--color-glass-hover)] hover:text-fg"><Image className="h-4 w-4" />媒体库</Link>
          <Link to="/admin/comments" className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted transition hover:bg-[var(--color-glass-hover)] hover:text-fg"><MessageSquare className="h-4 w-4" />评论管理</Link>
          <Link to="/admin/newsletter" className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted transition hover:bg-[var(--color-glass-hover)] hover:text-fg"><Mail className="h-4 w-4" />邮件订阅</Link>
          <Link to="/admin/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted transition hover:bg-[var(--color-glass-hover)] hover:text-fg"><Settings className="h-4 w-4" />系统设置</Link>
          <Link to="/" className="block rounded-lg px-3 py-2 text-muted transition hover:bg-[var(--color-glass-hover)] hover:text-fg">返回前台</Link>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-glass)] px-6 backdrop-blur-xl">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">管理后台</p>
            <p className="text-xs text-[var(--color-text-muted)]">统一管理博客、项目与帮助中心</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle showLabel />
            <button
              type="button"
              onClick={onLogout}
              className="nowen-button-secondary nowen-focus flex min-h-11 items-center gap-1.5 px-3 text-sm"
            >
              <LogOut className="h-4 w-4" />退出登录
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
}
