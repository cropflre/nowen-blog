import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { defaultSchema } from 'hast-util-sanitize';

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

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-brand">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, [rehypeSanitize, schema]]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
