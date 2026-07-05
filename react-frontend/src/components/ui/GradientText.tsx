import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface GradientTextProps {
  /** 文本内容 */
  children: ReactNode;
  /** 附加类名 */
  className?: string;
  /** 覆盖起始色，默认 var(--color-primary) */
  from?: string;
  /** 覆盖结束色，默认 var(--nebula-cyan) */
  to?: string;
}

/**
 * 渐变文字：默认靛蓝 → 青。
 * 直接使用 .gradient-text 工具类；如需自定义起止色，通过 from / to 覆盖。
 */
export function GradientText({ children, className, from, to }: GradientTextProps) {
  const style: CSSProperties | undefined =
    from || to
      ? {
          backgroundImage: `linear-gradient(135deg, ${from ?? 'var(--color-primary)'}, ${to ?? 'var(--nebula-cyan)'})`,
        }
      : undefined;

  return (
    <span className={cn('gradient-text', className)} style={style}>
      {children}
    </span>
  );
}

export default GradientText;
