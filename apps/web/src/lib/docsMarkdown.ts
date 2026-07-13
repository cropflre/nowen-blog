const CALLOUT_LABELS: Record<string, string> = {
  NOTE: '📝 说明',
  TIP: '💡 提示',
  IMPORTANT: '❗ 重要',
  WARNING: '⚠️ 警告',
  CAUTION: '🚨 注意',
};

/**
 * 将 GitHub 风格文档提示块转换为安全、通用的 GFM blockquote。
 * Markdown 渲染器仍负责 sanitize，未引入 MDX 或任意 HTML 执行能力。
 */
export function normalizeDocsMarkdown(content: string): string {
  return content.replace(
    /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/gim,
    (_match, type: string) => `> **${CALLOUT_LABELS[type.toUpperCase()] ?? type}**`,
  );
}
