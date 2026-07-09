import { Fragment, type ReactNode } from 'react';

// 与后端 FTS snippet 标记保持一致（控制字符，避免与正文冲突）
const START = String.fromCharCode(1);
const END = String.fromCharCode(2);

/**
 * 渲染后端返回的 snippet 片段：将 START…END 之间的命中文本高亮。
 * 使用控制字符标记并以 React 节点拼接，避免 dangerouslySetInnerHTML 带来的 XSS 风险。
 */
export function Highlight({ text }: { text: string }): ReactNode {
  const re = new RegExp(`${START}(.*?)${END}`, 'g');
  const parts = text.split(re);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded bg-brand/20 px-0.5 text-brand">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
