export type MarkdownHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface MarkdownHeading {
  id: string;
  text: string;
  level: MarkdownHeadingLevel;
  line: number;
}

/** 将 Markdown 标题文本转换为可读且稳定的 URL 片段。 */
export function slugifyHeading(value: string): string {
  const normalized = value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'section';
}

/**
 * 提取内联 Markdown 的可见文字，用于目录和锚点。
 * 不执行 HTML，仅处理常见 Markdown 标记。
 */
function visibleHeadingText(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[*_~]+/g, '')
    .replace(/\\([\\`*_[\]{}()#+\-.!])/g, '$1')
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * 从 Markdown 中提取 H1-H6，并按照出现顺序处理重复 ID。
 * 同时跳过 fenced code block，避免把代码示例中的 # 误判为标题。
 */
export function extractMarkdownHeadings(markdown: string): MarkdownHeading[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const headings: MarkdownHeading[] = [];
  const slugCounts = new Map<string, number>();
  let fence: '`' | '~' | null = null;
  let fenceLength = 0;

  const append = (rawText: string, level: MarkdownHeadingLevel, line: number) => {
    const text = visibleHeadingText(rawText.replace(/\s+#+\s*$/, ''));
    if (!text) return;

    const base = slugifyHeading(text);
    const count = (slugCounts.get(base) ?? 0) + 1;
    slugCounts.set(base, count);
    headings.push({
      id: count === 1 ? base : `${base}-${count}`,
      text,
      level,
      line,
    });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1]!;
      const markerType = marker[0] as '`' | '~';
      if (!fence) {
        fence = markerType;
        fenceLength = marker.length;
      } else if (markerType === fence && marker.length >= fenceLength) {
        fence = null;
        fenceLength = 0;
      }
      continue;
    }
    if (fence) continue;

    const atx = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*$/);
    if (atx) {
      append(atx[2]!, atx[1]!.length as MarkdownHeadingLevel, index + 1);
      continue;
    }

    const underline = lines[index + 1]?.match(/^\s{0,3}(=+|-+)\s*$/);
    if (line.trim() && underline) {
      append(line, underline[1]![0] === '=' ? 1 : 2, index + 1);
      index += 1;
    }
  }

  return headings;
}
