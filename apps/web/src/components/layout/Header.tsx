import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Sun, Moon } from 'lucide-react';
import { api } from '../../lib/api';
import { useTheme } from '../../lib/theme';
import { cn } from '../../lib/cn';

const NAV = [
  { to: '/posts', label: '文章' },
  { to: '/projects', label: '项目' },
  { to: '/categories', label: '分类' },
  { to: '/tags', label: '标签' },
  { to: '/archive', label: '归档' },
  { to: '/about', label: '关于' },
];

export function Header() {
  const { data: settings } = useQuery({ queryKey: ['site-settings'], queryFn: api.siteSettings });
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const term = q.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-4 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 font-semibold">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
          ) : (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-2 text-white">
              {(settings?.siteTitle ?? 'NOWEN Blog').slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="truncate">{settings?.siteTitle ?? 'NOWEN Blog'}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm text-muted transition hover:text-fg',
                  isActive && 'text-fg',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <form onSubmit={onSubmit} className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="搜索"
              className="w-32 rounded-lg border border-line bg-surface py-2 pl-8 pr-3 text-sm outline-none transition focus:border-brand md:w-48"
            />
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label="切换主题"
            className="rounded-lg border border-line p-2 text-muted transition hover:text-fg"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </header>
  );
}
