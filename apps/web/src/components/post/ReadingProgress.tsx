import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export function ReadingProgress({ targetRef }: { targetRef: RefObject<HTMLElement> }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const target = targetRef.current;
      if (!target) {
        setProgress(0);
        return;
      }

      const rect = target.getBoundingClientRect();
      const start = window.scrollY + rect.top - 96;
      const end = start + target.offsetHeight - window.innerHeight * 0.65;
      const distance = Math.max(1, end - start);
      const next = Math.min(1, Math.max(0, (window.scrollY - start) / distance));
      setProgress(next);
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleUpdate);
    if (targetRef.current) observer?.observe(targetRef.current);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [targetRef]);

  return (
    <div
      role="progressbar"
      aria-label="文章阅读进度"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-1 bg-transparent"
    >
      <div
        className="h-full origin-left bg-gradient-to-r from-brand to-brand-2 transition-transform duration-100 motion-reduce:transition-none"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
