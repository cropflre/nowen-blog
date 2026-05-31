import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const links = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.blog'), path: '/blog' },
    { label: t('nav.projects'), path: '/projects' },
  ];

  return (
    <footer className="border-t border-[var(--color-border-surface)] py-10">
      <div className="page-shell grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="mb-3 text-sm font-semibold">nowen-blog</div>
          <p className="max-w-sm text-sm leading-7 text-[var(--color-text-muted)]">{t('footer.tagline')}</p>
        </div>

        <div className="flex flex-col gap-4 md:items-end">
          <nav className="flex flex-wrap gap-5">
            {links.map((link) => (
              <Link key={link.path} to={link.path} className="minimal-link text-sm">
                {link.label}
              </Link>
            ))}
            <a href="https://github.com/cropflre" target="_blank" rel="noopener noreferrer" className="minimal-link text-sm">
              GitHub
            </a>
          </nav>
          <p className="text-xs text-[var(--color-text-muted)]">
            {t('footer.copyright').replace('2026', String(year))}
          </p>
        </div>
      </div>
    </footer>
  );
}
