import { Link, NavLink, useNavigate } from 'react-router-dom';
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
import { MotionOutlet } from '../motion/MotionOutlet';

const adminNav = [
  { to: '/admin', label: '首页', icon: LayoutDashboard, end: true },
  { to: '/admin/docs', label: '帮助中心', icon: BookOpen, accent: 'primary' },
  { to: '/admin/posts', label: '博客文章', icon: FileText },
  { to: '/admin/assets', label: '图片与文件', icon: Image },
  { to: '/admin/ai', label: 'AI 模型', icon: Sparkles, accent: 'ai' },
  { to: '/admin/settings', label: '系统设置', icon: Settings },
] as const;

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
      <aside className="nowen-admin-sidebar w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-glass-strong)] p-4 backdrop-blur-xl">
        <div className="mb-2 px-2 font-semibold">NOWEN 后台</div>
        <p className="mb-6 px-2 text-xs leading-5 text-[var(--color-text-muted)]">创建项目、写帮助文档、发布内容。</p>
        <nav className="space-y-1 text-sm" aria-label="后台导航">
          {adminNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : false}
                className={({ isActive }) =>
                  [
                    'nowen-admin-nav-link flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-muted',
                    isActive ? 'is-active text-fg' : '',
                    item.accent === 'ai' ? 'nowen-admin-nav-ai' : '',
                  ].filter(Boolean).join(' ')
                }
              >
                <Icon className={`h-4 w-4 ${item.accent === 'primary' ? 'text-[var(--color-primary)]' : item.accent === 'ai' ? 'text-violet-500' : ''}`} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          <Link to="/" className="nowen-admin-nav-link mt-4 block rounded-lg border border-[var(--color-border)] px-3 py-2 text-center text-muted">返回前台</Link>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="nowen-admin-header flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-glass)] px-6 backdrop-blur-xl">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">内容管理</p>
            <p className="text-xs text-[var(--color-text-muted)]">手动维护项目，AI 辅助生成帮助文档</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle showLabel />
            <button type="button" onClick={onLogout} className="nowen-button-secondary nowen-focus flex min-h-11 items-center gap-1.5 px-3 text-sm"><LogOut className="h-4 w-4" />退出登录</button>
          </div>
        </header>
        <main className="flex-1 overflow-auto"><MotionOutlet className="min-h-full" /></main>
      </div>
    </div>
  );
}
