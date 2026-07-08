export function slugify(input: string): string {
  return input
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export function estimateReadingTime(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  const cjk = (markdown.match(/[一-鿿]/g) || []).length;
  return Math.max(1, Math.round((words + cjk / 2) / 200));
}

export function randomId(prefix = ''): string {
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

export function nowIso(): string {
  return new Date().toISOString();
}
