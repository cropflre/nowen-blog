import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { api } from '../api';

interface SiteInfo {
  beian_enabled?: boolean;
  beian_number?: string;
}

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const [siteInfo, setSiteInfo] = useState<SiteInfo>({});

  const links = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.blog'), path: '/blog' },
    { label: t('nav.projects'), path: '/projects' },
  ];

  useEffect(() => {
    const fetchSiteInfo = async () => {
      try {
        const data = await api.getSite();
        setSiteInfo(data);
      } catch (error) {
        console.error('Failed to fetch site info:', error);
      }
    };
    fetchSiteInfo();
  }, []);

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
          {/* 备案信息展示 */}
          {siteInfo.beian_enabled && siteInfo.beian_number && (
            <p className="text-xs text-[var(--color-text-muted)]">
              <a
                href="https://beian.miit.gov.cn"
                target="_blank"
                rel="noopener noreferrer"
                className="minimal-link"
              >
                {siteInfo.beian_number}
              </a>
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
