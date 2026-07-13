import { useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Menu, Moon, Search, Sun, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useTheme } from '../../lib/theme';
import { cn } from '../../lib/cn';

const NAV = [
  { to: '/docs', label: '文档' },
  { to: '/projects', label: '项目' },
  { to: '/blog', label: '博客' },
  { to: '/categories', label: '分类' },
  { to: '/about', label: '关于' },
];

export function Header() {
  const { data: settings } = useQuery({ queryKey: ['site-settings'], queryFn: api.siteSettings });
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const term = q.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 font-semibold" onClick={() => setMobileOpen(false)}>
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
          ) : (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-2 text-white">
              {(settings?.siteTitle ?? 'NOWEN').slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="truncate">{settings?.siteTitle ?? 'NOWEN'}</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="主导航">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-surface hover:text-fg',
                  isActive && 'bg-surface text-fg',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <form onSubmit={onSubmit} className="ml-auto hidden items-center gap-2 sm:flex">
          <div className="relative hidden lg:block">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="搜索博客"
              className="w-44 rounded-lg border border-line bg-surface py-2 pl-8 pr-3 text-sm outline-none transition focus:border-brand xl:w-56"
            />
          </div>
          <Link
            to="/docs"
            className="nowen-focus hidden items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:text-fg xl:inline-flex"
          >
            <BookOpen className="h-4 w-4" /> 文档中心
          </Link>
          <button
            type="button"
            onClick={toggle}
            aria-label="切换主题"
            className="rounded-lg border border-line p-2 text-muted transition hover:text-fg"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={mobileOpen ? '关闭导航' : '打开导航'}
          className="nowen-focus ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line text-muted sm:ml-0 md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-line bg-bg/96 px-4 py-4 backdrop-blur-xl md:hidden">
          <nav className="mx-auto grid max-w-[1320px] gap-1" aria-label="移动端主导航">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-xl px-3 py-3 text-sm text-muted transition hover:bg-surface hover:text-fg',
                    isActive && 'bg-surface text-fg',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <form onSubmit={onSubmit} className="mx-auto mt-3 flex max-w-[1320px] items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="搜索博客"
                className="h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm outline-none focus:border-brand"
              />
            </div>
            <button type="button" onClick={toggle} className="nowen-focus flex h-11 w-11 items-center justify-center rounded-xl border border-line text-muted" aria-label="切换主题">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
