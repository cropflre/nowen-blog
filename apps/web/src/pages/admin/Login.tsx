import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

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
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-bold">后台登录</h1>
      <p className="mb-8 text-sm text-muted">登录以管理你的博客</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="用户名"
          autoComplete="username"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-brand"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          autoComplete="current-password"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-brand"
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-lg bg-gradient-to-r from-brand to-brand-2 px-4 py-2.5 text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? '登录中…' : '登录'}
        </button>
      </form>
    </div>
  );
}
