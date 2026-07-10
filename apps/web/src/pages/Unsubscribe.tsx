import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MailX } from 'lucide-react';
import { newsletterApi } from '../lib/blog19Api';
import { Seo } from '../components/seo/Seo';

export function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '正在处理退订请求…' : '退订链接缺少必要参数。');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void newsletterApi.unsubscribe(token)
      .then((result) => {
        if (cancelled) return;
        setStatus('success');
        setMessage(result.message);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : '退订失败，请稍后重试。');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="mx-auto flex min-h-[65vh] max-w-xl items-center px-4 py-16">
      <Seo title="邮件退订" description="管理文章更新邮件订阅。" />
      <div className="w-full rounded-[28px] border border-line bg-surface p-8 text-center md:p-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          {status === 'loading' ? <Loader2 className="h-7 w-7 animate-spin" /> : status === 'success' ? <CheckCircle2 className="h-7 w-7" /> : <MailX className="h-7 w-7" />}
        </div>
        <h1 className="mt-6 text-2xl font-bold">{status === 'success' ? '退订完成' : status === 'loading' ? '正在退订' : '无法完成退订'}</h1>
        <p className="mt-3 leading-7 text-muted">{message}</p>
        <Link to="/" className="mt-8 inline-flex rounded-xl border border-line px-5 py-2.5 text-sm font-medium transition hover:border-brand/60 hover:text-brand">返回首页</Link>
      </div>
    </div>
  );
}
