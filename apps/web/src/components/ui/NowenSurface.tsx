import { useEffect, useRef, type HTMLAttributes, type PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '../../lib/cn';

export interface NowenSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function NowenSurface({
  interactive = false,
  className,
  onPointerMove,
  children,
  ...props
}: NowenSurfaceProps) {
  const frame = useRef<number | null>(null);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    if (!interactive || event.pointerType === 'touch') return;

    const element = event.currentTarget;
    const clientX = event.clientX;
    const clientY = event.clientY;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const rect = element.getBoundingClientRect();
      element.style.setProperty('--spotlight-x', `${clientX - rect.left}px`);
      element.style.setProperty('--spotlight-y', `${clientY - rect.top}px`);
    });
  };

  return (
    <div
      {...props}
      data-interactive={interactive ? 'true' : 'false'}
      onPointerMove={handlePointerMove}
      className={cn('nowen-surface', className)}
    >
      {children}
    </div>
  );
}
