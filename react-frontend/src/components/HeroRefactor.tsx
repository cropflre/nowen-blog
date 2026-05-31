import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BookOpen, Languages, Menu, Moon, Sun, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

function GithubMark({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.77.42-1.3.76-1.6-2.66-.31-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.05.13 3 .4c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.69.8.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function HeroRefactor() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const techStack = ['Go', 'React', 'TypeScript', 'Docker', 'PostgreSQL', 'gRPC'];

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { path: '/', label: t('nav.home') },
    { path: '/blog', label: t('nav.blog') },
    { path: '/projects', label: t('nav.projects') },
  ];

  return (
    <section className="border-b border-[var(--color-border-surface)]">
      <header className="minimal-nav fixed inset-x-0 top-0 z-50">
        <nav className="page-shell flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-full border border-[var(--color-border)] text-xs">N</span>
            nowen-blog
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => {
              const active = link.path === '/' ? location.pathname === '/' : location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm transition-colors ${
                    active ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <a href="https://github.com/cropflre" target="_blank" rel="noopener noreferrer" className="minimal-button h-9 min-h-9 w-9 p-0" aria-label="GitHub">
              <GithubMark />
            </a>
            <button type="button" onClick={toggleTheme} className="minimal-button h-9 min-h-9 w-9 p-0" aria-label={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button type="button" onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')} className="minimal-button h-9 min-h-9 w-9 p-0" aria-label="Switch language">
              <Languages size={16} />
            </button>
          </div>

          <button type="button" className="minimal-button h-9 min-h-9 w-9 p-0 md:hidden" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle menu">
            {mobileOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </nav>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-[var(--color-border-surface)] bg-[var(--color-bg-primary)] md:hidden"
            >
              <div className="page-shell flex flex-col py-4">
                {navLinks.map((link) => (
                  <Link key={link.path} to={link.path} className="py-3 text-sm font-medium">
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="page-shell grid min-h-[78vh] items-center gap-12 pt-28 pb-20 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <span className="minimal-kicker">{t('hero.status')}</span>
          <h1 className="minimal-title max-w-3xl">
            {t('hero.roles.fullStack')}
            <span className="block text-[var(--color-text-muted)]">{t('hero.roles.creator')}</span>
          </h1>
          <p className="minimal-text mt-7 max-w-2xl text-lg">
            <Trans
              i18nKey="hero.bio"
              components={{
                strong: <span className="font-semibold text-[var(--color-text-primary)]" />,
              }}
            />
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {techStack.map((tech) => (
              <span key={tech} className="minimal-tag">
                {tech}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link to="/projects" className="minimal-button-primary">
              {t('hero.cta.viewProjects')}
              <ArrowRight size={16} />
            </Link>
            <Link to="/blog" className="minimal-button">
              <BookOpen size={16} />
              {t('hero.cta.readBlog')}
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="minimal-surface rounded-2xl p-6 md:p-8"
        >
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Focus</div>
              <p className="mt-3 text-2xl font-semibold leading-tight">Clean systems. Quiet interfaces.</p>
            </div>
            <div className="border-t border-[var(--color-border-surface)] pt-6 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 lg:border-l-0 lg:border-t lg:pl-0 lg:pt-6">
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Stack</div>
              <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                Go backend, React frontend, practical tooling, and documentation that stays readable.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
