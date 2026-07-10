import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

export function Login() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.login(username, password),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'me'] });
      navigate('/admin');
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-bg-primary)] px-4 py-16 text-[var(--color-text-primary)]">
      <div className="nowen-atmosphere" aria-hidden="true" />
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle showLabel />
      </div>

      <section className="nowen-surface relative z-10 w-full max-w-sm p-6 sm:p-8" aria-labelledby="admin-login-title">
        <p className="nowen-eyebrow">NOWEN ADMIN</p>
        <h1 id="admin-login-title" className="mt-3 text-2xl font-semibold tracking-tight">后台登录</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">登录以管理你的博客</p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="mt-8 space-y-4"
        >
          <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
            用户名
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="用户名"
              autoComplete="username"
              className="nowen-focus mt-2 w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-bg-tertiary)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
            />
          </label>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
            密码
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="密码"
              autoComplete="current-password"
              className="nowen-focus mt-2 w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-bg-tertiary)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
            />
          </label>

          {error && <p className="text-sm text-red-500" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="nowen-button-primary nowen-focus inline-flex w-full items-center justify-center px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? '登录中…' : '登录'}
          </button>
        </form>
      </section>
    </div>
  );
}
