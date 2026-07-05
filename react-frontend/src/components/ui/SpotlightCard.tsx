import { useRef, useState, useCallback, useEffect } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface SpotlightCardProps {
  /** 卡片内容 */
  children: ReactNode;
  /** 附加类名 */
  className?: string;
  /** 聚光灯颜色，默认靛蓝 */
  spotlightColor?: string;
  /** 内边距档位 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 轻量模式：禁用聚光与边框流光，纯 CSS hover，适合列表与移动端 */
  lightweight?: boolean;
  /** 点击回调（存在时启用指针手型与点按反馈） */
  onClick?: () => void;
  /** 右键回调 */
  onContextMenu?: (e: MouseEvent<HTMLDivElement>) => void;
}

const sizeClasses = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
  xl: 'p-8',
};

/**
 * NOWEN 风格 Spotlight 卡片
 * - 鼠标聚光：RAF 节流 + CSS 变量定位，避免频繁 setState
 * - 边框流光：hover 时沿边缘运动的光带（仅暗色）
 * - 轻量模式：列表 / 移动端用，无 framer-motion 开销
 *
 * 依赖 index.css 中的 --color-glass / --color-glass-border / --color-shadow 等
 * NOWEN token，以及 @custom-variant dark（让 dark: 类随 data-theme 生效）。
 */
export function SpotlightCard({
  children,
  className,
  spotlightColor = 'rgba(102, 126, 234, 0.15)',
  size = 'md',
  lightweight = false,
  onClick,
  onContextMenu,
}: SpotlightCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number>(0);
  const [opacity, setOpacity] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // RAF 节流鼠标移动，写入 CSS 变量，避免 React 重渲染
  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      containerRef.current.style.setProperty('--spotlight-x', `${x}px`);
      containerRef.current.style.setProperty('--spotlight-y', `${y}px`);
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setOpacity(1);
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setOpacity(0);
    setIsHovered(false);
  }, []);

  // 清理 RAF
  useEffect(() => {
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);

  // 轻量模式：纯 CSS，无聚光 / 流光，适合列表与移动端
  if (lightweight) {
    return (
      <div
        onClick={onClick}
        onContextMenu={onContextMenu}
        className={cn(
          'relative overflow-hidden rounded-2xl backdrop-blur-xl',
          'transition-all duration-300 hover:-translate-y-1',
          onClick && 'cursor-pointer active:scale-[0.98]',
          sizeClasses[size],
          className,
        )}
        style={{
          background: 'var(--color-glass)',
          border: '1px solid var(--color-glass-border)',
          boxShadow: 'var(--color-shadow)',
        }}
      >
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        'relative overflow-hidden rounded-2xl backdrop-blur-xl',
        'transition-all duration-500',
        onClick && 'cursor-pointer',
        sizeClasses[size],
        className,
      )}
      style={{
        '--spotlight-x': '0px',
        '--spotlight-y': '0px',
        background: 'var(--color-glass)',
        border: '1px solid var(--color-glass-border)',
        boxShadow: 'var(--color-shadow)',
      } as CSSProperties}
      whileHover={{
        y: -4,
        boxShadow: 'var(--color-shadow-hover)',
        transition: { duration: 0.3 },
      }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {/* 聚光灯：跟随鼠标的径向高光（仅暗色） */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300 will-change-transform dark:block hidden"
        style={{
          opacity,
          background: `radial-gradient(600px circle at var(--spotlight-x) var(--spotlight-y), ${spotlightColor}, transparent 40%)`,
        }}
      />

      {/* 边框发光：仅暗色 */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300 dark:block hidden"
        style={{
          opacity,
          background: `radial-gradient(400px circle at var(--spotlight-x) var(--spotlight-y), rgba(255,255,255,0.06), transparent 40%)`,
        }}
      />

      {/* 边框流光：hover 时沿边缘运动（仅暗色） */}
      {isHovered && (
        <div className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-2xl dark:block">
          <div
            className="animate-border-beam absolute h-20 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-sm will-change-transform"
            style={{ offsetPath: 'rect(0 100% 100% 0 round 16px)' } as CSSProperties}
          />
        </div>
      )}

      {/* 内容 */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

export default SpotlightCard;
