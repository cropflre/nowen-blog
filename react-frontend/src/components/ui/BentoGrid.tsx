import { motion } from 'framer-motion';
import type { MouseEvent, ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { SpotlightCard } from './SpotlightCard';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

/** Bento 网格容器：响应式 1 / 2 / 4 / 6 列 */
export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 auto-rows-[minmax(60px,auto)] sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface BentoGridItemProps {
  children: ReactNode;
  className?: string;
  /** 跨列数（响应式） */
  colSpan?: 1 | 2 | 3 | 4;
  /** 跨行数 */
  rowSpan?: 1 | 2 | 3;
  /** 聚光灯颜色，透传给 SpotlightCard */
  spotlightColor?: string;
  /** 内边距档位，透传给 SpotlightCard */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 点击回调 */
  onClick?: () => void;
  /** 右键回调 */
  onContextMenu?: (e: MouseEvent<HTMLDivElement>) => void;
  /** 入场延迟（秒） */
  delay?: number;
}

const colSpanClasses: Record<1 | 2 | 3 | 4, string> = {
  1: 'col-span-1',
  2: 'col-span-1 md:col-span-2',
  3: 'col-span-2 md:col-span-3',
  4: 'col-span-2 md:col-span-4',
};

const rowSpanClasses: Record<1 | 2 | 3, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
};

/** Bento 网格单元：外层做入场动画与跨格，内层交给 SpotlightCard */
export function BentoGridItem({
  children,
  className,
  colSpan = 1,
  rowSpan = 1,
  spotlightColor,
  size,
  onClick,
  onContextMenu,
  delay = 0,
}: BentoGridItemProps) {
  return (
    <motion.div
      className={cn(colSpanClasses[colSpan], rowSpanClasses[rowSpan])}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    >
      <SpotlightCard
        className={cn('h-full', className)}
        spotlightColor={spotlightColor}
        size={size}
        onClick={onClick}
        onContextMenu={onContextMenu}
      >
        {children}
      </SpotlightCard>
    </motion.div>
  );
}

/** Bento 首屏布局：大英雄卡 + 可选侧卡 + 下方网格 */
export function BentoHeroLayout({
  heroContent,
  sideContent,
  gridItems,
}: {
  heroContent: ReactNode;
  sideContent?: ReactNode;
  gridItems: ReactNode[];
}) {
  return (
    <div className="space-y-4">
      {/* 顶部：英雄卡 + 侧卡 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SpotlightCard className="h-full min-h-[200px]" size="lg">
            {heroContent}
          </SpotlightCard>
        </motion.div>

        {sideContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <SpotlightCard className="h-full min-h-[200px]" size="lg">
              {sideContent}
            </SpotlightCard>
          </motion.div>
        )}
      </div>

      {/* 下方网格 */}
      <BentoGrid>{gridItems}</BentoGrid>
    </div>
  );
}

export default BentoGrid;
