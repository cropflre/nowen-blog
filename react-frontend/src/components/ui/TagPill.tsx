import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface TagPillProps {
  /** 胶囊内容 */
  children: ReactNode;
  /** 是否处于激活态 */
  active?: boolean;
  /** 点击回调；提供时渲染为按钮 */
  onClick?: () => void;
  /** 附加类名 */
  className?: string;
}

/**
 * 标签胶囊：玻璃质感，主题感知。
 * - 激活态：玻璃底 + 主文字色
 * - 默认态：透明底 + 次文字色，hover 提亮
 */
export function TagPill({ children, active = false, onClick, className }: TagPillProps) {
  const base = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all';
  const looks = active
    ? 'border border-[var(--color-glass-border)] bg-[var(--color-glass)] text-[var(--color-text-primary)] backdrop-blur-md'
    : 'border border-[var(--color-glass-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-text-primary)]';

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(base, looks, className)}>
        {children}
      </button>
    );
  }

  return (
    <span className={cn(base, looks, className)}>
      {children}
    </span>
  );
}

export default TagPill;
