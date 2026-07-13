import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Menu,
  Search,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { docsApi, type DocumentItem, type DocSearchItem } from '../../lib/docsApi';
import { normalizeDocsMarkdown } from '../../lib/docsMarkdown';
import { Markdown } from '../../components/markdown/Markdown';
import { extractMarkdownHeadings } from '../../components/markdown/headings';
import { TableOfContents } from '../../components/post/TableOfContents';
import { Seo } from '../../components/seo/Seo';

interface TreeNode extends DocumentItem {
  children: TreeNode[];
}

function buildTree(items: DocumentItem[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const item of items) map.set(item.id, { ...item, children: [] });
  const roots: TreeNode[] = [];
  for (const item of map.values()) {
    const parent = item.parentId ? map.get(item.parentId) : undefined;
    if (parent) parent.children.push(item);
    else roots.push(item);
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'zh-CN'));
    for (const node of nodes) sort(node.children);
  };
  sort(roots);
  return roots;
}

function NavNode({
  node,
  activePath,
  hrefFor,
  onNavigate,
}: {
  node: TreeNode;
  activePath: string;
  hrefFor: (path: string) => string;
  onNavigate?: () => void;
}) {
  const active = node.path === activePath;
  const containsActive = activePath.startsWith(`${node.path}/`);
  const [open, setOpen] = useState(active || containsActive || node.depth === 0);

  useEffect(() => {
    if (active || containsActive) setOpen(true);
  }, [active, containsActive]);

  return (
    <li>
      <div className="flex items-center gap-1">
        {node.children.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="nowen-focus flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-text-primary)]"
            aria-label={open ? '收起目录' : '展开目录'}
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="h-7 w-7 shrink-0" />
        )}
        <Link
          to={hrefFor(node.path)}
          onClick={onNavigate}
          className={`nowen-focus min-w-0 flex-1 rounded-lg px-2.5 py-2 text-sm transition ${
            active
              ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] font-medium text-[var(--color-primary)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <span className="block truncate">{node.title}</span>
        </Link>
      </div>
      {open && node.children.length > 0 && (
        <ul className="ml-3 border-l border-[var(--color-border-light)] pl-2">
          {node.children.map((child) => (
            <NavNode
              key={child.id}
              node={child}
              activePath={activePath}
              hrefFor={hrefFor}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function SidebarContent({
  spaceSlug,
  version,
  activePath,
  items,
  children,
  onNavigate,
}: {
  spaceSlug: string;
  version: string;
  activePath: string;
  items: DocumentItem[];
  children?: ReactNode;
  onNavigate?: () => void;
}) {
  const tree = useMemo(() => buildTree(items), [items]);
  const hrefFor = (path: string) => `/docs/${spaceSlug}/${version}/${path}`;
  return (
    <div className="flex h-full min-h-0 flex-col">
      {children}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-6" aria-label="文档目录">
        {tree.length > 0 ? (
          <ul className="space-y-0.5">
            {tree.map((node) => (
              <NavNode
                key={node.id}
                node={node}
                activePath={activePath}
                hrefFor={hrefFor}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        ) : (
          <p className="px-3 py-8 text-center text-sm text-[var(--color-text-muted)]">当前版本暂无已发布文档。</p>
        )}
      </nav>
    </div>
  );
}

function DocsSearch({ spaceSlug, onNavigate }: { spaceSlug: string; onNavigate?: () => void }) {
  const [query, setQuery] = useState('');
  const results = useQuery({
    queryKey: ['docs', 'search', spaceSlug, query.trim()],
    queryFn: () => docsApi.search(query.trim(), spaceSlug),
    enabled: query.trim().length >= 2,
  });

  return (
    <div className="relative px-3 pb-4">
      <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-[calc(50%+0.5rem)] text-[var(--color-text-muted)]" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="搜索当前项目"
        className="nowen-focus h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] pl-9 pr-3 text-sm"
      />
      {query.trim().length >= 2 && (
        <div className="absolute left-3 right-3 top-11 z-30 max-h-80 overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-glass-strong)] p-1.5 shadow-xl backdrop-blur-xl">
          {results.isPending ? (
            <p className="p-4 text-center text-xs text-[var(--color-text-muted)]">搜索中…</p>
          ) : results.data?.items.length ? (
            results.data.items.map((item: DocSearchItem) => (
              <Link
                key={item.id}
                to={`/docs/${item.spaceSlug}/${item.version}/${item.path}`}
                onClick={() => {
                  setQuery('');
                  onNavigate?.();
                }}
                className="block rounded-lg px-3 py-2.5 hover:bg-[var(--color-glass-hover)]"
              >
                <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{item.title}</p>
                <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{item.path}</p>
              </Link>
            ))
          ) : (
            <p className="p-4 text-center text-xs text-[var(--color-text-muted)]">未找到相关文档。</p>
          )}
        </div>
      )}
    </div>
  );
}

export function DocPage() {
  const params = useParams<{ spaceSlug: string; version: string; '*': string }>();
  const navigate = useNavigate();
  const articleRef = useRef<HTMLDivElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'sent'>('idle');
  const spaceSlug = params.spaceSlug ?? '';
  const requestedVersion = params.version ?? 'latest';
  const path = (params['*'] ?? '').replace(/^\/+|\/+$/g, '');

  const spaceQuery = useQuery({
    queryKey: ['docs', 'space', spaceSlug],
    queryFn: () => docsApi.getSpace(spaceSlug),
    enabled: Boolean(spaceSlug),
  });
  const treeQuery = useQuery({
    queryKey: ['docs', 'tree', spaceSlug, requestedVersion],
    queryFn: () => docsApi.getTree(spaceSlug, requestedVersion),
    enabled: Boolean(spaceSlug),
  });
  const pageQuery = useQuery({
    queryKey: ['docs', 'page', spaceSlug, requestedVersion, path],
    queryFn: () => docsApi.getPage(spaceSlug, requestedVersion, path),
    enabled: Boolean(spaceSlug),
  });

  const resolvedVersion = treeQuery.data?.version.version ?? requestedVersion;
  const resolvedPath = pageQuery.data?.page.path ?? path;
  const headings = useMemo(
    () => extractMarkdownHeadings(pageQuery.data?.page.contentMd ?? '').filter((heading) => heading.level <= 4),
    [pageQuery.data?.page.contentMd],
  );

  useEffect(() => {
    setFeedbackState('idle');
    articleRef.current?.scrollIntoView({ block: 'start' });
  }, [pageQuery.data?.page.id]);

  useEffect(() => {
    const page = pageQuery.data;
    if (!page) return;
    if (requestedVersion !== page.version.version || path !== page.page.path) {
      navigate(`/docs/${spaceSlug}/${page.version.version}/${page.page.path}`, { replace: true });
    }
  }, [navigate, pageQuery.data, path, requestedVersion, spaceSlug]);

  const feedback = useMutation({
    mutationFn: (helpful: boolean) => docsApi.submitFeedback(pageQuery.data!.page.id, helpful),
    onSuccess: () => setFeedbackState('sent'),
  });

  if (treeQuery.isPending || pageQuery.isPending || spaceQuery.isPending) {
    return <div className="mx-auto max-w-6xl px-4 py-24 text-center text-[var(--color-text-muted)]">正在加载文档…</div>;
  }

  if (treeQuery.isError || pageQuery.isError || !treeQuery.data || !pageQuery.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <BookOpen className="mx-auto h-12 w-12 text-[var(--color-text-muted)]" />
        <h1 className="mt-5 text-2xl font-semibold text-[var(--color-text-primary)]">文档不存在或尚未发布</h1>
        <p className="mt-3 text-[var(--color-text-secondary)]">请检查项目、版本或文档路径是否正确。</p>
        <Link to="/docs" className="nowen-button-primary nowen-focus mt-7 inline-flex items-center gap-2 px-5 py-3 text-sm">
          <ArrowLeft className="h-4 w-4" /> 返回文档中心
        </Link>
      </div>
    );
  }

  const { space, version, items } = treeQuery.data;
  const { page, previous, next } = pageQuery.data;

  const switchVersion = (nextVersion: string) => {
    navigate(`/docs/${space.slug}/${nextVersion}/${resolvedPath}`);
  };

  return (
    <div className="bg-[var(--color-bg-primary)]">
      <Seo
        title={`${page.seoTitle || page.title} - ${space.name}`}
        description={page.seoDescription || page.description || space.description || undefined}
        canonical={`/docs/${space.slug}/${version.version}/${page.path}`}
      />

      <div className="sticky top-16 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/92 backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="nowen-focus inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium"
          >
            <Menu className="h-4 w-4" /> 目录
          </button>
          <span className="min-w-0 truncate text-sm text-[var(--color-text-secondary)]">{space.name} · {version.label}</span>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1480px] grid-cols-1 lg:grid-cols-[280px_minmax(0,820px)] xl:grid-cols-[280px_minmax(0,820px)_240px] xl:justify-center">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)]/55 lg:block">
          <SidebarContent
            spaceSlug={space.slug}
            version={resolvedVersion}
            activePath={page.path}
            items={items}
          >
            <div className="border-b border-[var(--color-border)] p-4">
              <Link to="/docs" className="text-xs font-medium text-[var(--color-primary)] hover:underline">全部文档</Link>
              <div className="mt-3 flex items-center gap-3">
                {space.iconUrl ? (
                  <img src={space.iconUrl} alt="" className="h-10 w-10 rounded-xl object-contain" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
                    <BookOpen className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[var(--color-text-primary)]">{space.name}</p>
                  <select
                    value={version.version}
                    onChange={(event) => switchVersion(event.target.value)}
                    className="mt-1 w-full bg-transparent text-xs text-[var(--color-text-muted)] outline-none"
                    aria-label="切换文档版本"
                  >
                    {(spaceQuery.data?.versions ?? [version]).map((item) => (
                      <option key={item.id} value={item.version}>{item.label}{item.isDeprecated ? '（已弃用）' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <DocsSearch spaceSlug={space.slug} />
          </SidebarContent>
        </aside>

        <main className="min-w-0 px-4 py-10 sm:px-7 lg:px-10 lg:py-14" ref={articleRef}>
          <div className="mx-auto max-w-[780px]">
            <nav className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]" aria-label="面包屑">
              <Link to="/docs" className="hover:text-[var(--color-primary)]">文档</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link to={`/docs/${space.slug}/${version.version}`} className="hover:text-[var(--color-primary)]">{space.name}</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="truncate text-[var(--color-text-secondary)]">{page.title}</span>
            </nav>

            <header className="mt-7 border-b border-[var(--color-border)] pb-8">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[var(--color-text-muted)]">{version.label}</span>
                {page.sourceType === 'github' && (
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[var(--color-text-muted)]">GitHub 同步</span>
                )}
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-4xl">{page.title}</h1>
              {page.description && <p className="mt-4 text-base leading-8 text-[var(--color-text-secondary)]">{page.description}</p>}
              <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)]">
                <span>最后更新：{new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(page.updatedAt))}</span>
                {page.editUrl && (
                  <a href={page.editUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline">
                    在 GitHub 编辑 <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </header>

            {headings.length > 0 && <TableOfContents headings={headings} variant="mobile" />}

            <article className="mt-8">
              <Markdown content={normalizeDocsMarkdown(page.contentMd)} headings={headings} />
            </article>

            <div className="mt-14 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
              {feedbackState === 'sent' ? (
                <p className="flex items-center justify-center gap-2 text-sm text-[var(--color-text-secondary)]"><Check className="h-4 w-4 text-emerald-500" />感谢反馈，我们会持续改进文档。</p>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">这篇文档对你有帮助吗？</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => feedback.mutate(true)}
                      disabled={feedback.isPending}
                      className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-3 py-2 text-sm"
                    >
                      <ThumbsUp className="h-4 w-4" /> 有帮助
                    </button>
                    <button
                      type="button"
                      onClick={() => feedback.mutate(false)}
                      disabled={feedback.isPending}
                      className="nowen-button-secondary nowen-focus inline-flex items-center gap-2 px-3 py-2 text-sm"
                    >
                      <ThumbsDown className="h-4 w-4" /> 没有
                    </button>
                  </div>
                </div>
              )}
            </div>

            <nav className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="相邻文档">
              {previous ? (
                <Link to={`/docs/${space.slug}/${version.version}/${previous.path}`} className="group rounded-2xl border border-[var(--color-border)] p-5 transition hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))]">
                  <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]"><ArrowLeft className="h-3.5 w-3.5" /> 上一篇</span>
                  <span className="mt-2 block font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">{previous.title}</span>
                </Link>
              ) : <span />}
              {next && (
                <Link to={`/docs/${space.slug}/${version.version}/${next.path}`} className="group rounded-2xl border border-[var(--color-border)] p-5 text-right transition hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))]">
                  <span className="flex items-center justify-end gap-1 text-xs text-[var(--color-text-muted)]">下一篇 <ArrowRight className="h-3.5 w-3.5" /></span>
                  <span className="mt-2 block font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">{next.title}</span>
                </Link>
              )}
            </nav>
          </div>
        </main>

        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] overflow-y-auto border-l border-[var(--color-border)] px-5 py-12 xl:block">
          {headings.length > 0 ? <TableOfContents headings={headings} variant="desktop" /> : (
            <p className="text-xs text-[var(--color-text-muted)]">本页暂无目录</p>
          )}
        </aside>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/55" aria-label="关闭文档目录" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,340px)] flex-col bg-[var(--color-bg-primary)] shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-4">
              <p className="font-semibold text-[var(--color-text-primary)]">{space.name}</p>
              <button type="button" onClick={() => setMobileNavOpen(false)} className="nowen-focus rounded-lg p-2" aria-label="关闭目录"><X className="h-5 w-5" /></button>
            </div>
            <SidebarContent
              spaceSlug={space.slug}
              version={resolvedVersion}
              activePath={page.path}
              items={items}
              onNavigate={() => setMobileNavOpen(false)}
            >
              <div className="p-4">
                <select
                  value={version.version}
                  onChange={(event) => {
                    switchVersion(event.target.value);
                    setMobileNavOpen(false);
                  }}
                  className="nowen-focus h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-sm"
                >
                  {(spaceQuery.data?.versions ?? [version]).map((item) => (
                    <option key={item.id} value={item.version}>{item.label}</option>
                  ))}
                </select>
              </div>
              <DocsSearch spaceSlug={space.slug} onNavigate={() => setMobileNavOpen(false)} />
            </SidebarContent>
          </aside>
        </div>
      )}
    </div>
  );
}
