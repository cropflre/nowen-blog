import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function Footer() {
  const { data: settings } = useQuery({ queryKey: ['site-settings'], queryFn: api.siteSettings });
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-[1120px] gap-5 px-4 py-10 text-sm text-muted md:grid-cols-[1fr_auto_auto] md:items-center">
        <div>
          <p className="font-medium text-fg">{settings?.siteTitle ?? 'NOWEN Blog'}</p>
          <p>{settings?.footerText || settings?.slogan}</p>
        </div>
        <div className="flex flex-wrap gap-4">
          {settings?.social.github && <a href={settings.social.github} target="_blank" rel="noreferrer">GitHub</a>}
          {settings?.social.twitter && <a href={settings.social.twitter} target="_blank" rel="noreferrer">Twitter / X</a>}
          {settings?.social.email && <a href={`mailto:${settings.social.email}`}>Email</a>}
          {settings?.social.rss && <a href="/rss.xml" target="_blank" rel="noreferrer">RSS</a>}
          <a href="/sitemap.xml" target="_blank" rel="noreferrer">Sitemap</a>
        </div>
        <p className="md:text-right">
          © {year} {settings?.authorName}
          {settings?.icp ? ` · ${settings.icp}` : ''}
        </p>
      </div>
    </footer>
  );
}
