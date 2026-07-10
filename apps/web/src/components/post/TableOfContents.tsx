import { useEffect, useMemo, useState } from 'react';
import { ListTree } from 'lucide-react';
import type { MarkdownHeading } from '../markdown/headings';

interface TableOfContentsProps {
  headings: MarkdownHeading[];
  variant: 'mobile' | 'desktop';
}

export function TableOfContents({ headings, variant }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? '');
  const minLevel = useMemo(
    () => Math.min(...headings.map((heading) => heading.level), 6),
    [headings],
  );

  useEffect(() => {
    if (headings.length === 0) return;
    let frame = 0;

    const updateActiveHeading = () => {
      frame = 0;
      const offset = 128;
      let next = headings[0]!.id;
      for (const heading of headings) {
        const element = document.getElementById(heading.id);
        if (!element) continue;
        if (element.getBoundingClientRect().top <= offset) next = heading.id;
        else break;
      }
      setActiveId(next);
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateActiveHeading);
    };

    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash && headings.some((heading) => heading.id === hash)) {
      window.requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ block: 'start' });
      });
    }

    updateActiveHeading();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [headings]);

  if (headings.length === 0) return null;

  const onNavigate = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    const element = document.getElementById(id);
    if (!element) return;
    window.history.replaceState(null, '', `#${encodeURIComponent(id)}`);
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
    event.currentTarget.closest('details')?.removeAttribute('open');
  };

  const links = (
    <ol className="space-y-1.5">
      {headings.map((heading) => {
        const active = heading.id === activeId;
        return (
          <li key={`${heading.line}-${heading.id}`} style={{ paddingLeft: `${Math.max(0, heading.level - minLevel) * 12}px` }}>
            <a
              href={`#${heading.id}`}
              onClick={(event) => onNavigate(event, heading.id)}
              aria-current={active ? 'location' : undefined}
              className={`block border-l-2 py-1 pl-3 text-sm leading-5 transition ${
                active
                  ? 'border-brand font-medium text-brand'
                  : 'border-transparent text-muted hover:border-line hover:text-fg'
              }`}
            >
              {heading.text}
            </a>
          </li>
        );
      })}
    </ol>
  );

  if (variant === 'mobile') {
    return (
      <details className="mb-8 rounded-card border border-line bg-surface p-4 xl:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-fg [&::-webkit-details-marker]:hidden">
          <ListTree className="h-4 w-4 text-brand" />
          文章目录
          <span className="ml-auto text-xs font-normal text-muted">{headings.length} 节</span>
        </summary>
        <nav aria-label="文章目录" className="mt-4 border-t border-line pt-4">
          {links}
        </nav>
      </details>
    );
  }

  return (
    <aside className="hidden xl:block">
      <nav aria-label="文章目录" className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-fg">
          <ListTree className="h-4 w-4 text-brand" />
          文章目录
        </div>
        {links}
      </nav>
    </aside>
  );
}
