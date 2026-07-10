import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { api } from '../../lib/api';

export function Layout() {
  const { data: settings } = useQuery({ queryKey: ['site-settings'], queryFn: api.siteSettings });

  useEffect(() => {
    if (!settings) return;

    document.documentElement.style.setProperty('--color-primary', settings.themeColor);
    document.documentElement.style.setProperty('--brand', settings.themeColor);

    let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.name = 'theme-color';
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = settings.themeColor;

    if (settings.faviconUrl) {
      let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = settings.faviconUrl;
    }
  }, [settings]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
