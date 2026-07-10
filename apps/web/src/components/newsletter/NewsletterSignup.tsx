import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { newsletterApi } from '../../lib/blog19Api';

export function NewsletterSignup({ compact = false, source = 'homepage' }: { compact?: boolean; source?: string }) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className={compact ? '' : 'rounded-[28px] border border-line bg-surface p-6 md:p-8'}>
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-brand/10 p-2.5 text-brand"><Mail className="h-5 w-5" /></span>
        <div>
          <h2 className={compact ? 'font-semibold' : 'text-xl font-semibold'}>订阅文章更新</h2>
          <p className="mt-1 text-sm leading-6 text-muted">只发送新文章和重要项目更新，不发送营销垃圾邮件，可随时退订。</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-4 py-3 text-sm outline-none transition placeholder:text-muted/60 focus:border-brand/70"
        />
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
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {pending ? '订阅中…' : '立即订阅'}
        </button>
      </form>

      {message && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-500"><CheckCircle2 className="h-4 w-4" />{message}</p>}
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
    </div>
  );
}
