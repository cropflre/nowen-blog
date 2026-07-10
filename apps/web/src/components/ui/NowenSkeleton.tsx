import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function NowenSkeleton({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} aria-hidden="true" className={cn('nowen-skeleton block', className)} />;
}

export function HomeCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn('nowen-surface p-5', compact ? 'min-h-36' : 'min-h-64')} aria-hidden="true">
      {!compact && <NowenSkeleton className="mb-5 aspect-[16/7] w-full" />}
      <NowenSkeleton className="h-3 w-24" />
      <NowenSkeleton className="mt-4 h-5 w-3/4" />
      <NowenSkeleton className="mt-3 h-3 w-full" />
      <NowenSkeleton className="mt-2 h-3 w-2/3" />
      <div className="mt-6 flex gap-2">
        <NowenSkeleton className="h-5 w-14" />
        <NowenSkeleton className="h-5 w-16" />
      </div>
    </div>
  );
}
