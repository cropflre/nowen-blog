import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileText,
  Menu,
  Search,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { helpCenterApi } from '../../lib/helpCenterApi';
import type { DocumentItem } from '../../lib/docsApi';
import { normalizeDocsMarkdown } from '../../lib/docsMarkdown';
import { Markdown } from '../../components/markdown/Markdown';
import { Seo } from '../../components/seo/Seo';

interface SectionGroup {
  root: DocumentItem;
  children: DocumentItem[];
}

function normalizedRoutePath(rawPath: string): string {
  const value = rawPath.replace(/^\/+|\/+$/g, '');
  if (value === 'latest') return '';
  return value.replace(/^latest\//, '');
}

function buildGroups(items: DocumentItem[]): SectionGroup[] {
  const roots = items
    .filter((item) => !item.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'zh-CN'));
  const children = new Map<string, DocumentItem[]>();
  for (const item of items) {
    if (!item.parentId) continue;
    const group = children.get(item.parentId) ?? [];
    group.push(item);
    children.set(item.parentId, group);
  }
  for (const group of children.values()) {
    group.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'zh-CN'));
  }
  return roots.map((root) => ({ root, children: children.get(root.id) ?? [] }));
}

function HelpSidebar({
  items,
  activeId,
  spaceSlug,
  onNavigate,
}: {
  items: DocumentItem[];
  activeId?: string;
  spaceSlug: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="帮助中心目录" className="space-y-6 pb-8">
      {buildGroups(items).map(({ root, children }) => (
        <section key={root.id}>
          <Link
            to={`/docs/${spaceSlug}/${root.path}`}
            onClick={onNavigate}
            className={`nowen-focus flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              activeId === root.id
                ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-primary)] hover:bg-[var(--color-glass-hover)]'
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="truncate">{root.title}</span>
          </Link>
          {children.length > 0 && (
            <div className="mt-1 space-y-0.5 border-l border-[var(--color-border)] pl-3">
              {children.map((child) => (
                <Link
                  key={child.id}
                  to={`/docs/${spaceSlug}/${child.path}`}
                  onClick={onNavigate}
                  className={`nowen-focus flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                    activeId === child.id
                      ? 'bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] font-medium text-[var(--color-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{child.title}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      ))}
    </nav>
  );
}

export function DocPage() {
  const params = useParams();
  const spaceSlug = params.spaceSlug ?? '';
  const path = normalizedRoutePath(params['*'] ?? '');
  const [menuOpen, setMenuOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const tree = useQuery({
    queryKey: ['help-center', spaceSlug, 'tree'],
    queryFn: () => helpCenterApi.tree(spaceSlug),
    enabled: Boolean(spaceSlug),
  });
  const page = useQuery({
    queryKey: ['help-center', spaceSlug, 'page', path],
    queryFn: () => helpCenterApi.page(spaceSlug, path),
    enabled: Boolean(spaceSlug),
  });
  const search = useQuery({
    queryKey: ['help-center', spaceSlug, 'search', keyword.trim()],
    queryFn: () => helpCenterApi.search(keyword.trim(), spaceSlug),
    enabled: Boolean(spaceSlug) && keyword.trim().length >= 2,
  });
  const feedback = useMutation({
    mutationFn: (helpful: boolean) => {
      const documentId = page.data?.page.id;
      if (!documentId) throw new Error('文档不存在');
      return helpCenterApi.feedback(documentId, helpful);
    },
    onSuccess: () => setFeedbackSent(true),
  });

  useEffect(() => {
    setMenuOpen(false);
    setFeedbackSent(false);
    setKeyword('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [path]);

  const helpCenter = tree.data?.helpCenter ?? page.data?.helpCenter;
  const activePage = page.data?.page;
  const treeItems = tree.data?.items ?? [];
  const parent = useMemo(
    () => treeItems.find((item) => item.id === activePage?.parentId) ?? null,
    [activePage?.parentId, treeItems],
  );

  if (tree.isPending || page.isPending) {
    return <div className="min-h-[70vh] animate-pulse bg-[var(--color-bg-primary)]" />;
  }

  if (!helpCenter || !activePage || tree.isError || page.isError) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <BookOpen className="h-12 w-12 text-[var(--color-text-muted)]" />
        <h1 className="mt-5 text-2xl font-semibold text-[var(--color-text-primary)]">帮助文档暂时不可用</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">这个帮助中心还没有公开内容，或者当前链接已经失效。</p>
        <Link to="/docs" className="nowen-button-primary nowen-focus mt-6 px-5 py-2.5 text-sm">返回帮助中心</Link>
      </div>
    );
  }

  const canonicalPath = `/docs/${helpCenter.slug}/${activePage.path}`;
  const previousPage = page.data?.previous ?? null;
  const nextPage = page.data?.next ?? null;
  const searchItems = search.data?.items ?? [];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-bg-primary)]">
      <Seo
        title={`${activePage.seoTitle || activePage.title} - ${helpCenter.name} 帮助中心`}
        description={activePage.seoDescription || activePage.description || helpCenter.description}
        canonical={canonicalPath}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: activePage.seoTitle || activePage.title,
          description: activePage.seoDescription || activePage.description || undefined,
          dateModified: activePage.updatedAt,
          mainEntityOfPage: canonicalPath,
        }}
      />

      <header className="sticky top-16 z-40 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg-primary)_94%,transparent)] backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <button type="button" onClick={() => setMenuOpen(true)} className="nowen-focus flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] lg:hidden" aria-label="打开目录"><Menu className="h-5 w-5" /></button>
          <Link to={`/docs/${helpCenter.slug}`} className="min-w-0 font-semibold text-[var(--color-text-primary)]"><span className="truncate">{helpCenter.name} 帮助中心</span></Link>
          <div className="relative ml-auto w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索本项目" className="nowen-focus h-10 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] pl-9 pr-4 text-sm" />
            {keyword.trim().length >= 2 && (
              <div className="absolute right-0 top-12 z-50 w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-xl">
                {search.isPending ? <p className="p-4 text-sm text-[var(--color-text-muted)]">正在搜索…</p> : searchItems.length ? searchItems.slice(0, 8).map((item) => (
                  <Link key={item.id} to={`/docs/${item.spaceSlug}/${item.path}`} className="nowen-focus block border-b border-[var(--color-border)] px-4 py-3 last:border-b-0 hover:bg-[var(--color-glass-hover)]">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.title}</p>
                    {item.description && <p className="mt-1 line-clamp-1 text-xs text-[var(--color-text-muted)]">{item.description}</p>}
                  </Link>
                )) : <p className="p-4 text-sm text-[var(--color-text-muted)]">没有找到相关文档</p>}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-8rem)] border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] lg:block">
          <div className="sticky top-32 max-h-[calc(100vh-8rem)] overflow-y-auto px-4 py-6"><HelpSidebar items={treeItems} activeId={activePage.id} spaceSlug={helpCenter.slug} /></div>
        </aside>

        <main className="min-w-0 px-5 py-10 sm:px-8 lg:px-12 lg:py-12">
          <article className="mx-auto max-w-[820px]">
            <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]" aria-label="面包屑">
              <Link to="/docs" className="hover:text-[var(--color-primary)]">帮助中心</Link><span>/</span>
              <Link to={`/docs/${helpCenter.slug}`} className="hover:text-[var(--color-primary)]">{helpCenter.name}</Link>
              {parent && <><span>/</span><Link to={`/docs/${helpCenter.slug}/${parent.path}`} className="hover:text-[var(--color-primary)]">{parent.title}</Link></>}
            </nav>

            <header className="border-b border-[var(--color-border)] pb-7">
              <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[var(--color-text-primary)] sm:text-4xl">{activePage.title}</h1>
              {activePage.description && <p className="mt-4 text-base leading-7 text-[var(--color-text-secondary)]">{activePage.description}</p>}
              <p className="mt-4 text-xs text-[var(--color-text-muted)]">最后更新：{activePage.updatedAt.slice(0, 10)}</p>
            </header>

            <div className="py-8"><Markdown content={normalizeDocsMarkdown(activePage.contentMd)} /></div>

            <section className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
              {feedbackSent ? <p className="text-center text-sm text-emerald-600">感谢反馈，我们会继续完善帮助文档。</p> : (
                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">这篇文档对你有帮助吗？</p>
                  <div className="flex gap-2">
                    <button type="button" disabled={feedback.isPending} onClick={() => feedback.mutate(true)} className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-4 py-2 text-sm"><ThumbsUp className="h-4 w-4" />有帮助</button>
                    <button type="button" disabled={feedback.isPending} onClick={() => feedback.mutate(false)} className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-4 py-2 text-sm"><ThumbsDown className="h-4 w-4" />没解决</button>
                  </div>
                </div>
              )}
            </section>

            <nav className="mt-8 grid gap-3 border-t border-[var(--color-border)] pt-8 sm:grid-cols-2" aria-label="上一篇和下一篇">
              {previousPage ? <Link to={`/docs/${helpCenter.slug}/${previousPage.path}`} className="nowen-focus rounded-xl border border-[var(--color-border)] p-4 transition hover:border-[var(--color-primary)]"><span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]"><ArrowLeft className="h-3.5 w-3.5" />上一篇</span><p className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">{previousPage.title}</p></Link> : <span />}
              {nextPage && <Link to={`/docs/${helpCenter.slug}/${nextPage.path}`} className="nowen-focus rounded-xl border border-[var(--color-border)] p-4 text-right transition hover:border-[var(--color-primary)]"><span className="flex items-center justify-end gap-1 text-xs text-[var(--color-text-muted)]">下一篇<ArrowRight className="h-3.5 w-3.5" /></span><p className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">{nextPage.title}</p></Link>}
            </nav>
          </article>
        </main>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button type="button" aria-label="关闭目录" className="absolute inset-0 bg-black/45" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[min(86vw,320px)] overflow-y-auto bg-[var(--color-bg-primary)] shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-4"><p className="font-semibold text-[var(--color-text-primary)]">{helpCenter.name} 帮助中心</p><button type="button" onClick={() => setMenuOpen(false)} className="nowen-focus flex h-9 w-9 items-center justify-center rounded-lg"><X className="h-5 w-5" /></button></div>
            <div className="px-4 py-6"><HelpSidebar items={treeItems} activeId={activePage.id} spaceSlug={helpCenter.slug} onNavigate={() => setMenuOpen(false)} /></div>
          </aside>
        </div>
      )}
    </div>
  );
}
