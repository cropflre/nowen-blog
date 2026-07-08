import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function Footer() {
  const { data: settings } = useQuery({ queryKey: ['site-settings'], queryFn: api.siteSettings });
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-4 py-10 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium text-fg">{settings?.siteTitle ?? 'NOWEN Blog'}</p>
          <p>{settings?.slogan}</p>
        </div>
        <div className="flex gap-4">
          {settings?.social.github && (
            <a href={settings.social.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
          )}
          {settings?.social.email && (
            <a href={`mailto:${settings.social.email}`}>Email</a>
          )}
          {settings?.social.rss && <Link to="/rss.xml">RSS</Link>}
        </div>
        <p>
          © {year} {settings?.authorName}
          {settings?.icp ? ` · ${settings.icp}` : ''}
        </p>
      </div>
    </footer>
  );
}
