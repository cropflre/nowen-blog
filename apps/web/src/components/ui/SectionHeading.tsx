import type { ReactNode } from 'react';

export function SectionHeading({
  icon,
  eyebrow,
  title,
  description,
  action,
  id,
}: {
  icon?: ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-glass)] text-[var(--color-primary)] shadow-[var(--color-shadow)]">
              {icon}
            </span>
          )}
          <p className="nowen-eyebrow">{eyebrow}</p>
        </div>
        <h2 id={id} className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text-primary)] md:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)] md:text-base">
            {description}
          </p>
        )}
      </div>
      {action && <div className="hidden shrink-0 sm:block">{action}</div>}
    </div>
  );
}
