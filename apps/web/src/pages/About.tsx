import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Seo } from '../components/seo/Seo';

export function About() {
  const { data: settings } = useQuery({ queryKey: ['site-settings'], queryFn: api.siteSettings });
  const title = settings?.siteTitle ? `关于 - ${settings.siteTitle}` : '关于';

  return (
    <div className="mx-auto max-w-[760px] px-4 py-16">
      <Seo title={title} description={settings?.siteDescription} />
      <h1 className="text-3xl font-bold">{settings?.authorName ?? 'NOWEN'}</h1>
      <p className="mt-2 text-muted">{settings?.siteDescription}</p>

      <div className="mt-10 space-y-6 text-fg/90">
        <section>
          <h2 className="mb-2 text-lg font-semibold">我是谁</h2>
          <p className="text-muted">
            一名关注前端工程化、Node.js 与开源的全栈工程师，喜欢把想法写成代码和文章。
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold">我关注什么</h2>
          <p className="text-muted">React 生态、类型安全、开发者体验，以及内容创作本身。</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold">联系方式</h2>
          <ul className="space-y-1 text-muted">
            {settings?.social.github && (
              <li>
                GitHub：
                <a className="text-brand" href={settings.social.github} target="_blank" rel="noreferrer">
                  {settings.social.github}
                </a>
              </li>
            )}
            {settings?.social.email && (
              <li>
                Email：
                <a className="text-brand" href={`mailto:${settings.social.email}`}>
                  {settings.social.email}
                </a>
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
