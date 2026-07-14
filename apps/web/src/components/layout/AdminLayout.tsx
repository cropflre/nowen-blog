import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  LogOut,
  FileText,
  BookOpen,
  Image,
  Settings,
  Sparkles,
  LayoutDashboard,
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
        <div className="mb-2 px-2 font-semibold">NOWEN 后台</div>
        <p className="mb-6 px-2 text-xs leading-5 text-[var(--color-text-muted)]">创建项目、写帮助文档、发布内容。</p>
        <nav className="space-y-1 text-sm" aria-label="后台导航">
          <Link to="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted transition hover:bg-[var(--color-glass-hover)] hover:text-fg"><LayoutDashboard className="h-4 w-4" />首页</Link>
          <Link to="/admin/docs" className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-muted transition hover:border-[color-mix(in_srgb,var(--color-primary)_20%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] hover:text-fg"><BookOpen className="h-4 w-4 text-[var(--color-primary)]" />帮助中心</Link>
          <Link to="/admin/posts" className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted transition hover:bg-[var(--color-glass-hover)] hover:text-fg"><FileText className="h-4 w-4" />博客文章</Link>
          <Link to="/admin/assets" className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted transition hover:bg-[var(--color-glass-hover)] hover:text-fg"><Image className="h-4 w-4" />图片与文件</Link>
          <Link to="/admin/ai" className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-muted transition hover:border-violet-500/20 hover:bg-gradient-to-r hover:from-violet-500/10 hover:to-cyan-500/5 hover:text-fg"><Sparkles className="h-4 w-4 text-violet-500" />AI 模型</Link>
          <Link to="/admin/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted transition hover:bg-[var(--color-glass-hover)] hover:text-fg"><Settings className="h-4 w-4" />系统设置</Link>
          <Link to="/" className="mt-4 block rounded-lg border border-[var(--color-border)] px-3 py-2 text-center text-muted transition hover:bg-[var(--color-glass-hover)] hover:text-fg">返回前台</Link>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-glass)] px-6 backdrop-blur-xl">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">内容管理</p>
            <p className="text-xs text-[var(--color-text-muted)]">手动维护项目，AI 辅助生成帮助文档</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle showLabel />
            <button type="button" onClick={onLogout} className="nowen-button-secondary nowen-focus flex min-h-11 items-center gap-1.5 px-3 text-sm"><LogOut className="h-4 w-4" />退出登录</button>
          </div>
        </header>
        <main className="flex-1 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
}
