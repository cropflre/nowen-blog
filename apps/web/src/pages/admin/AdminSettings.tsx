import { useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Save, Settings } from 'lucide-react';
import type { SiteSettings } from '../../types';
import { adminSettingsApi } from '../../lib/adminSettingsApi';

const inputClass =
  'mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-glow)]';

function nullable(value: string): string | null {
  return value.trim() || null;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-glass)] p-5 lg:p-6">
      <h2 className="font-semibold text-[var(--color-text-primary)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">{children}</div>
    </section>
  );
}

export function AdminSettings() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminSettingsApi.get });
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    const { updatedAt: _updatedAt, ...settings } = query.data;
    setForm(settings);
  }, [query.data]);

  const save = async () => {
    if (!form || saving) return;
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const result = await adminSettingsApi.update(form);
      const { updatedAt: _updatedAt, ...publicSettings } = result;
      queryClient.setQueryData(['admin', 'settings'], result);
      queryClient.setQueryData(['site-settings'], publicSettings);
      setForm(publicSettings);
      setSuccess('系统设置已保存并立即生效。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (query.isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center gap-2 text-[var(--color-text-muted)]"><Loader2 className="h-5 w-5 animate-spin" />正在加载系统设置…</div>;
  }
  if (query.isError || !form) {
    return <div className="p-8"><div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-500">设置加载失败：{query.error instanceof Error ? query.error.message : '未知错误'}</div></div>;
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><Settings className="h-6 w-6 text-[var(--color-primary)]" /><h1 className="text-2xl font-bold">系统设置</h1></div>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">只保留站点展示需要的基础设置。</p>
        </div>
        <button type="button" disabled={saving} onClick={() => void save()} className="nowen-button-primary nowen-focus inline-flex min-h-11 items-center gap-2 px-5 text-sm disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? '保存中…' : '保存设置'}
        </button>
      </header>

      {success && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" />{success}</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div>}

      <Section title="站点信息" description="用于首页、导航和页脚。">
        <label className="text-sm font-medium">站点标题<input className={inputClass} value={form.siteTitle} maxLength={80} onChange={(event) => setForm({ ...form, siteTitle: event.target.value })} /></label>
        <label className="text-sm font-medium">作者名称<input className={inputClass} value={form.authorName} maxLength={80} onChange={(event) => setForm({ ...form, authorName: event.target.value })} /></label>
        <label className="text-sm font-medium">站点标语<input className={inputClass} value={form.slogan} maxLength={120} onChange={(event) => setForm({ ...form, slogan: event.target.value })} /></label>
        <label className="text-sm font-medium">ICP备案号<input className={inputClass} value={form.icp ?? ''} maxLength={120} onChange={(event) => setForm({ ...form, icp: nullable(event.target.value) })} /></label>
        <label className="text-sm font-medium lg:col-span-2">站点描述<textarea className={`${inputClass} min-h-24 resize-y`} value={form.siteDescription} maxLength={300} onChange={(event) => setForm({ ...form, siteDescription: event.target.value })} /></label>
        <label className="text-sm font-medium lg:col-span-2">页脚文字<input className={inputClass} value={form.footerText ?? ''} maxLength={300} onChange={(event) => setForm({ ...form, footerText: nullable(event.target.value) })} /></label>
      </Section>

      <Section title="品牌外观" description="图片可以使用媒体库中的站内地址。">
        <label className="text-sm font-medium">Logo 地址<input className={inputClass} value={form.logoUrl ?? ''} placeholder="/uploads/logo.png" onChange={(event) => setForm({ ...form, logoUrl: nullable(event.target.value) })} /></label>
        <label className="text-sm font-medium">Favicon 地址<input className={inputClass} value={form.faviconUrl ?? ''} placeholder="/uploads/favicon.png" onChange={(event) => setForm({ ...form, faviconUrl: nullable(event.target.value) })} /></label>
        <label className="text-sm font-medium">主题色<div className="mt-2 flex gap-3"><input type="color" className="h-11 w-14 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1" value={form.themeColor} onChange={(event) => setForm({ ...form, themeColor: event.target.value })} /><input className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 text-sm" value={form.themeColor} maxLength={7} onChange={(event) => setForm({ ...form, themeColor: event.target.value })} /></div></label>
      </Section>

      <Section title="联系与订阅" description="可选填写公开联系方式。">
        <label className="text-sm font-medium">Twitter / X<input className={inputClass} value={form.social.twitter ?? ''} placeholder="https://x.com/username" onChange={(event) => setForm({ ...form, social: { ...form.social, twitter: nullable(event.target.value) } })} /></label>
        <label className="text-sm font-medium">公开联系邮箱<input type="email" className={inputClass} value={form.social.email ?? ''} placeholder="hello@example.com" onChange={(event) => setForm({ ...form, social: { ...form.social, email: nullable(event.target.value) } })} /></label>
        <button type="button" role="switch" aria-checked={form.social.rss} onClick={() => setForm({ ...form, social: { ...form.social, rss: !form.social.rss } })} className="flex min-h-14 items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 text-left text-sm">
          <span><span className="block font-medium">显示 RSS 订阅</span><span className="mt-1 block text-xs text-[var(--color-text-muted)]">控制前台是否展示 RSS 入口。</span></span>
          <span className={`relative h-6 w-11 rounded-full ${form.social.rss ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${form.social.rss ? 'left-6' : 'left-1'}`} /></span>
        </button>
      </Section>

      <Section title="默认 SEO" description="内容没有单独设置时使用这些默认值。">
        <label className="text-sm font-medium">默认 SEO 标题<input className={inputClass} value={form.defaultSeoTitle ?? ''} maxLength={80} onChange={(event) => setForm({ ...form, defaultSeoTitle: nullable(event.target.value) })} /></label>
        <label className="text-sm font-medium">默认分享图片<input className={inputClass} value={form.defaultOgImage ?? ''} placeholder="/uploads/og-cover.png" onChange={(event) => setForm({ ...form, defaultOgImage: nullable(event.target.value) })} /></label>
        <label className="text-sm font-medium lg:col-span-2">默认 SEO 描述<textarea className={`${inputClass} min-h-24 resize-y`} value={form.defaultSeoDescription ?? ''} maxLength={300} onChange={(event) => setForm({ ...form, defaultSeoDescription: nullable(event.target.value) })} /></label>
      </Section>

      <Section title="互动功能" description="控制读者是否可以评论博客文章。">
        <button type="button" role="switch" aria-checked={form.commentsEnabled} onClick={() => setForm({ ...form, commentsEnabled: !form.commentsEnabled })} className="flex min-h-14 items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 text-left text-sm lg:col-span-2">
          <span><span className="block font-medium">开启文章评论</span><span className="mt-1 block text-xs text-[var(--color-text-muted)]">关闭后隐藏评论区，历史评论仍会保留。</span></span>
          <span className={`relative h-6 w-11 rounded-full ${form.commentsEnabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${form.commentsEnabled ? 'left-6' : 'left-1'}`} /></span>
        </button>
      </Section>
    </div>
  );
}
