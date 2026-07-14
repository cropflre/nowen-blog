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
          <h2 className="mb-2 text-lg font-semibold">我们在做什么</h2>
          <p className="text-muted">持续打磨知识管理、数字阅读和内容处理工具，并为每个项目维护简单易懂的官方帮助中心。</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold">帮助中心原则</h2>
          <p className="text-muted">一个项目一个帮助中心，目录最多两级。项目和文档全部手动可控，AI 只生成待审核草稿。</p>
        </section>
        {settings?.social.email && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">联系方式</h2>
            <p className="text-muted">
              Email：
              <a className="text-brand" href={`mailto:${settings.social.email}`}>
                {settings.social.email}
              </a>
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
