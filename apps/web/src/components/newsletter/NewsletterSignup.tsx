import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { newsletterApi } from '../../lib/blog19Api';
import { NowenSurface } from '../ui/NowenSurface';

export function NewsletterSignup({
  compact = false,
  source = 'homepage',
  variant = 'default',
}: {
  compact?: boolean;
  source?: string;
  variant?: 'default' | 'home';
}) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isHome = variant === 'home';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const result = await newsletterApi.subscribe(email, source, website);
      setMessage(result.message);
      setEmail('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '订阅失败，请稍后重试');
    } finally {
      setPending(false);
    }
  };

  const content = (
    <div className={isHome ? 'grid items-center gap-7 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] md:p-10' : compact ? '' : 'p-6 md:p-8'}>
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-glass-border)] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
          <Mail className="h-5 w-5" />
        </span>
        <div>
          <p className="nowen-eyebrow">Quiet updates</p>
          <h2 className={compact ? 'mt-2 font-semibold' : 'mt-2 text-xl font-semibold tracking-[-0.02em] md:text-2xl'}>订阅文章更新</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-text-secondary)]">
            只发送新文章和重要项目更新，不发送营销垃圾邮件，可随时退订。
          </p>
        </div>
      </div>

      <div>
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <label className="min-w-0 flex-1">
            <span className="sr-only">邮箱地址</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="nowen-focus min-h-11 w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-bg-tertiary)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
            />
          </label>
          <input
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            className="absolute -left-[9999px] h-px w-px opacity-0"
          />
          <button
            type="submit"
            disabled={pending}
            className="nowen-button-primary nowen-focus inline-flex shrink-0 items-center justify-center gap-2 px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {pending ? '订阅中…' : '立即订阅'}
          </button>
        </form>

        <div aria-live="polite" className="min-h-6">
          {message && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-500"><CheckCircle2 className="h-4 w-4" />{message}</p>}
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );

  if (compact) return content;
  if (isHome) return <NowenSurface interactive>{content}</NowenSurface>;
  return <div className="rounded-[28px] border border-line bg-surface">{content}</div>;
}
