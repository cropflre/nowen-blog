import { useEffect } from 'react';
import {
  setSeo,
  setCanonical,
  setOg,
  setTwitter,
  setJsonLd,
  removeJsonLd,
  absUrl,
} from '../../lib/seo';

export interface SeoProps {
  title?: string;
  description?: string | null;
  /** 规范链接；可为相对路径（如 /posts/:slug）或绝对地址。 */
  canonical?: string | null;
  /** 封面图地址，用于 og:image / twitter:image（会自动转为绝对地址）。 */
  image?: string | null;
  type?: 'website' | 'article';
  /** JSON-LD 结构化数据对象；传 null 或不传则清除。 */
  jsonLd?: object | null;
}

export function Seo({ title, description, canonical, image, type = 'website', jsonLd }: SeoProps) {
  useEffect(() => {
    // 当前为 React SPA，meta 在客户端更新。
    // 若需搜索引擎首屏即可见这些 meta，应在后续 BLOG-10.1 通过 SSR/SSG/预渲染生成。
    if (title) setSeo(title, description);
    setCanonical(canonical ?? undefined);
    setOg({
      title,
      description,
      image: image ? absUrl(image) : null,
      type,
      url: canonical ?? undefined,
    });
    setTwitter({ title, description, image: image ? absUrl(image) : null });
    if (jsonLd) setJsonLd(jsonLd);
    else removeJsonLd();
    return () => removeJsonLd();
  }, [title, description, canonical, image, type, jsonLd]);
  return null;
}
