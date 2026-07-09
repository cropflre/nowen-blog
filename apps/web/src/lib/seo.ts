/** 设置文档标题与 description meta。注意：当前为 SPA，meta 在客户端更新。 */
export function setSeo(title: string, description?: string | null) {
  document.title = title;
  if (description) {
    setMeta('name', 'description', description);
  }
}

/** 基于当前部署源生成绝对地址（用于 OG / JSON-LD / canonical）。 */
export function absUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path, window.location.origin).href;
}

export function setCanonical(url?: string) {
  upsertLink('canonical', url);
}

export function setOg(opts: {
  title?: string;
  description?: string | null;
  image?: string | null;
  type?: string;
  url?: string | null;
}) {
  if (opts.title) setMeta('property', 'og:title', opts.title);
  if (opts.description) setMeta('property', 'og:description', opts.description);
  setMeta('property', 'og:type', opts.type ?? 'website');
  if (opts.url) setMeta('property', 'og:url', opts.url);
  if (opts.image) setMeta('property', 'og:image', opts.image);
}

export function setTwitter(opts: {
  title?: string;
  description?: string | null;
  image?: string | null;
}) {
  setMeta('name', 'twitter:card', 'summary_large_image');
  if (opts.title) setMeta('name', 'twitter:title', opts.title);
  if (opts.description) setMeta('name', 'twitter:description', opts.description);
  if (opts.image) setMeta('name', 'twitter:image', opts.image);
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href?: string) {
  const head = document.head;
  const existing = head.querySelector(`link[rel="${rel}"]`);
  if (!href) {
    if (existing) existing.remove();
    return;
  }
  let el = existing;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function setJsonLd(obj: object) {
  removeJsonLd();
  const el = document.createElement('script');
  el.type = 'application/ld+json';
  el.textContent = JSON.stringify(obj);
  document.head.appendChild(el);
}

export function removeJsonLd() {
  document.head
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((n) => n.remove());
}
