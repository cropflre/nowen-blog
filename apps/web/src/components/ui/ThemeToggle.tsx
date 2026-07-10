import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../lib/theme';
import { cn } from '../../lib/cn';

export function ThemeToggle({
  showLabel = false,
  className,
}: {
  showLabel?: boolean;
  className?: string;
}) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const actionLabel = isDark ? '切换到日间模式' : '切换到夜间模式';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={actionLabel}
      title={actionLabel}
      aria-pressed={!isDark}
      className={cn(
        'nowen-icon-button nowen-focus inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-medium',
        className,
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {showLabel && <span>{isDark ? '日间模式' : '夜间模式'}</span>}
    </button>
  );
}
