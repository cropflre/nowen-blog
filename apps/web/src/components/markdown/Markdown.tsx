import {
  Children,
  createElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  HTMLAttributes,
  ImgHTMLAttributes,
  ReactNode,
  SyntheticEvent,
} from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { defaultSchema } from 'hast-util-sanitize';
import { Check, Copy, X, ZoomIn } from 'lucide-react';
import {
  extractMarkdownHeadings,
  slugifyHeading,
  type MarkdownHeading,
} from './headings';

// 在默认 sanitize schema 基础上允许 highlight.js 添加的 className，
// 既保留代码高亮，又防止 XSS。
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ['className']],
    span: [...(defaultSchema.attributes?.span ?? []), ['className']],
    pre: [...(defaultSchema.attributes?.pre ?? []), ['className']],
  },
};

interface MarkdownAstNode {
  position?: {
    start?: {
      line?: number;
    };
  };
}

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  node?: MarkdownAstNode;
  children?: ReactNode;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  headingsByLine: Map<number, string>;
}

interface LightboxImage {
  src: string;
  alt: string;
}

function nodeText(value: ReactNode): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value === null || value === undefined || typeof value === 'boolean') return '';
  if (Array.isArray(value)) return value.map(nodeText).join('');
  if (isValidElement<{ children?: ReactNode }>(value)) return nodeText(value.props.children);
  return Children.toArray(value).map(nodeText).join('');
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('浏览器不支持复制');
}

function CodeBlock({ children, className, ...props }: HTMLAttributes<HTMLPreElement>) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const resetTimer = useRef<number | null>(null);
  const firstChild = Children.toArray(children)[0];
  const codeClass = isValidElement<{ className?: string }>(firstChild)
    ? firstChild.props.className ?? ''
    : '';
  const language = codeClass.match(/language-([\w-]+)/)?.[1];
  const code = nodeText(children).replace(/\n$/, '');

  useEffect(
    () => () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const onCopy = async () => {
    try {
      await copyText(code);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopyState('idle'), 1800);
  };

  return (
    <div className="not-prose group relative my-6 overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex min-h-10 items-center justify-between border-b border-line bg-bg/70 px-3">
        <span className="text-xs uppercase tracking-wide text-muted">{language ?? 'code'}</span>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted transition hover:bg-surface hover:text-fg"
          aria-label="复制代码"
        >
          {copyState === 'copied' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copyState === 'copied' ? '已复制' : copyState === 'error' ? '复制失败' : '复制'}
        </button>
      </div>
      <pre
        {...props}
        className={`m-0 max-w-full overflow-x-auto rounded-none border-0 bg-transparent p-4 text-sm leading-6 ${className ?? ''}`}
      >
        {children}
      </pre>
    </div>
  );
}

function HeadingElement({
  node,
  children,
  level,
  headingsByLine,
  className,
  ...props
}: HeadingProps) {
  const line = node?.position?.start?.line;
  const id = (line ? headingsByLine.get(line) : undefined) ?? slugifyHeading(nodeText(children));
  const tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  return createElement(
    tag,
    { ...props, id, className: `group scroll-mt-24 ${className ?? ''}` },
    children,
    <a
      key="heading-anchor"
      href={`#${id}`}
      aria-label={`链接到“${nodeText(children)}”`}
      className="ml-2 text-brand opacity-0 no-underline transition group-hover:opacity-70 focus:opacity-100"
    >
      #
    </a>,
  );
}

function MarkdownImage({
  src,
  alt,
  onOpen,
  className,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { onOpen: (image: LightboxImage) => void }) {
  if (!src) return null;

  const open = (event: SyntheticEvent<HTMLImageElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onOpen({ src, alt: alt ?? '' });
  };

  return (
    <img
      {...props}
      src={src}
      alt={alt ?? ''}
      loading="lazy"
      decoding="async"
      role="button"
      tabIndex={0}
      aria-label={`${alt || '文章图片'}，点击放大`}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') open(event);
      }}
      className={`cursor-zoom-in transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand/60 ${className ?? ''}`}
    />
  );
}

export function Markdown({
  content,
  headings,
}: {
  content: string;
  headings?: MarkdownHeading[];
}) {
  const [lightbox, setLightbox] = useState<LightboxImage | null>(null);
  const resolvedHeadings = useMemo(
    () => headings ?? extractMarkdownHeadings(content),
    [content, headings],
  );
  const headingsByLine = useMemo(
    () => new Map(resolvedHeadings.map((heading) => [heading.line, heading.id])),
    [resolvedHeadings],
  );

  useEffect(() => {
    if (!lightbox) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightbox]);

  const components = useMemo<Components>(
    () => ({
      h1: ({ node, ...props }) => <HeadingElement {...props} node={node as MarkdownAstNode} level={1} headingsByLine={headingsByLine} />,
      h2: ({ node, ...props }) => <HeadingElement {...props} node={node as MarkdownAstNode} level={2} headingsByLine={headingsByLine} />,
      h3: ({ node, ...props }) => <HeadingElement {...props} node={node as MarkdownAstNode} level={3} headingsByLine={headingsByLine} />,
      h4: ({ node, ...props }) => <HeadingElement {...props} node={node as MarkdownAstNode} level={4} headingsByLine={headingsByLine} />,
      h5: ({ node, ...props }) => <HeadingElement {...props} node={node as MarkdownAstNode} level={5} headingsByLine={headingsByLine} />,
      h6: ({ node, ...props }) => <HeadingElement {...props} node={node as MarkdownAstNode} level={6} headingsByLine={headingsByLine} />,
      pre: ({ node: _node, ...props }) => <CodeBlock {...props} />,
      img: ({ node: _node, ...props }) => <MarkdownImage {...props} onOpen={setLightbox} />,
    }),
    [headingsByLine],
  );

  return (
    <>
      <div className="prose dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-brand">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight, [rehypeSanitize, schema]]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.alt || '图片预览'}
          onMouseDown={() => setLightbox(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="关闭图片预览"
            className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/40 p-2 text-white transition hover:bg-black/70"
          >
            <X className="h-5 w-5" />
          </button>
          <figure
            onMouseDown={(event) => event.stopPropagation()}
            className="flex max-h-[92vh] max-w-[min(94vw,1440px)] flex-col items-center gap-3"
          >
            <img
              src={lightbox.src}
              alt={lightbox.alt}
              className="max-h-[84vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            {lightbox.alt && <figcaption className="text-center text-sm text-white/75">{lightbox.alt}</figcaption>}
          </figure>
          <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 text-xs text-white/60">
            <ZoomIn className="h-3.5 w-3.5" />按 Esc 或点击空白处关闭
          </div>
        </div>
      )}
    </>
  );
}
