import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Globe2,
  Loader2,
  MessageSquare,
  Palette,
  Save,
  Search,
  Settings,
  Share2,
} from 'lucide-react';
import type { SiteSettings } from '../../types';
import { adminSettingsApi } from '../../lib/adminSettingsApi';

const inputClass =
  'mt-2 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-fg outline-none transition placeholder:text-muted/60 focus:border-brand/70';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-fg">{label}</span>
      {hint && <span className="ml-2 text-xs text-muted">{hint}</span>}
      {children}
    </label>
  );
}

function Section({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Settings;
  children: ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-surface">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4 lg:px-6">
        <div className="rounded-lg border border-brand/20 bg-brand/10 p-2 text-brand">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-2 lg:p-6">{children}</div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-line bg-bg/40 p-4 text-left transition hover:border-brand/50"
    >
      <span>
        <span className="block text-sm font-medium text-fg">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-brand' : 'bg-line'}`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'left-6' : 'left-1'}`}
        />
      </span>
    </button>
  );
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function AdminSettings() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminSettingsApi.get });
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    const { updatedAt: _updatedAt, ...settings } = query.data;
    setForm(settings);
  }, [query.data]);

  const save = async () => {
    if (!form || saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await adminSettingsApi.update(form);
      queryClient.setQueryData(['admin', 'settings'], result);
      const { updatedAt: _updatedAt, ...publicSettings } = result;
      queryClient.setQueryData(['site-settings'], publicSettings);
      setForm(publicSettings);
      setMessage('系统设置已保存并立即生效。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (query.isLoading || !form) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        正在加载系统设置…
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="p-8">
        <div className="rounded-card border border-red-500/30 bg-red-500/10 p-8 text-center text-red-400">
          设置加载失败：{query.error instanceof Error ? query.error.message : '未知错误'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-brand" />
            <h1 className="text-2xl font-bold">系统设置</h1>
          </div>
          <p className="mt-2 text-sm text-muted">
            统一管理站点品牌、默认 SEO、社交信息和互动功能。
          </p>
          {query.data?.updatedAt && (
            <p className="mt-1 text-xs text-muted">最后更新：{formatDate(query.data.updatedAt)}</p>
          )}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? '保存中…' : '保存设置'}
        </button>
      </header>

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Section title="基础信息" description="用于首页、导航、页脚和站点身份展示。" icon={Globe2}>
        <Field label="站点标题" hint="必填，最多 80 字符">
          <input
            className={inputClass}
            value={form.siteTitle}
            maxLength={80}
            onChange={(event) => setForm({ ...form, siteTitle: event.target.value })}
          />
        </Field>
        <Field label="作者名称" hint="必填">
          <input
            className={inputClass}
            value={form.authorName}
            maxLength={80}
            onChange={(event) => setForm({ ...form, authorName: event.target.value })}
          />
        </Field>
        <Field label="站点标语">
          <input
            className={inputClass}
            value={form.slogan}
            maxLength={120}
            onChange={(event) => setForm({ ...form, slogan: event.target.value })}
          />
        </Field>
        <Field label="ICP备案号" hint="可选">
          <input
            className={inputClass}
            value={form.icp ?? ''}
            maxLength={120}
            onChange={(event) => setForm({ ...form, icp: nullable(event.target.value) })}
          />
        </Field>
        <div className="lg:col-span-2">
          <Field label="站点描述" hint="用于首页和搜索引擎摘要">
            <textarea
              className={`${inputClass} min-h-24 resize-y`}
              value={form.siteDescription}
              maxLength={300}
              onChange={(event) => setForm({ ...form, siteDescription: event.target.value })}
            />
          </Field>
        </div>
        <div className="lg:col-span-2">
          <Field label="页脚文字" hint="可选，最多 300 字符">
            <input
              className={inputClass}
              value={form.footerText ?? ''}
              maxLength={300}
              onChange={(event) => setForm({ ...form, footerText: nullable(event.target.value) })}
            />
          </Field>
        </div>
      </Section>

      <Section title="品牌与外观" description="支持站内 /uploads 路径或完整 HTTPS 地址。" icon={Palette}>
        <Field label="Logo 地址">
          <input
            className={inputClass}
            value={form.logoUrl ?? ''}
            placeholder="/uploads/logo.png"
            onChange={(event) => setForm({ ...form, logoUrl: nullable(event.target.value) })}
          />
        </Field>
        <Field label="Favicon 地址">
          <input
            className={inputClass}
            value={form.faviconUrl ?? ''}
            placeholder="/uploads/favicon.png"
            onChange={(event) => setForm({ ...form, faviconUrl: nullable(event.target.value) })}
          />
        </Field>
        <Field label="主题色" hint="六位十六进制颜色">
          <div className="mt-2 flex gap-3">
            <input
              type="color"
              className="h-10 w-14 rounded-lg border border-line bg-bg p-1"
              value={form.themeColor}
              onChange={(event) => setForm({ ...form, themeColor: event.target.value })}
            />
            <input
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand/70"
              value={form.themeColor}
              maxLength={7}
              onChange={(event) => setForm({ ...form, themeColor: event.target.value })}
            />
          </div>
        </Field>
        <div className="rounded-xl border border-line bg-bg/40 p-4">
          <p className="text-sm font-medium">品牌预览</p>
          <div className="mt-3 flex items-center gap-3">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="Logo 预览" className="h-10 w-10 rounded-lg object-contain" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: form.themeColor }}>
                {form.siteTitle.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold">{form.siteTitle}</p>
              <p className="text-xs text-muted">{form.slogan}</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="社交与订阅" description="在前台页脚和个人信息区域展示。" icon={Share2}>
        <Field label="GitHub">
          <input
            className={inputClass}
            value={form.social.github ?? ''}
            placeholder="https://github.com/username"
            onChange={(event) => setForm({ ...form, social: { ...form.social, github: nullable(event.target.value) } })}
          />
        </Field>
        <Field label="Twitter / X">
          <input
            className={inputClass}
            value={form.social.twitter ?? ''}
            placeholder="https://x.com/username"
            onChange={(event) => setForm({ ...form, social: { ...form.social, twitter: nullable(event.target.value) } })}
          />
        </Field>
        <Field label="公开联系邮箱">
          <input
            type="email"
            className={inputClass}
            value={form.social.email ?? ''}
            placeholder="hello@example.com"
            onChange={(event) => setForm({ ...form, social: { ...form.social, email: nullable(event.target.value) } })}
          />
        </Field>
        <Toggle
          checked={form.social.rss}
          onChange={(rss) => setForm({ ...form, social: { ...form.social, rss } })}
          label="显示 RSS 订阅"
          description="控制前台是否展示 RSS 订阅入口，不会删除已有订阅地址。"
        />
      </Section>

      <Section title="默认 SEO" description="文章未单独配置时，可使用这些站点级默认值。" icon={Search}>
        <Field label="默认 SEO 标题" hint="可选">
          <input
            className={inputClass}
            value={form.defaultSeoTitle ?? ''}
            maxLength={80}
            onChange={(event) => setForm({ ...form, defaultSeoTitle: nullable(event.target.value) })}
          />
        </Field>
        <Field label="默认分享图片">
          <input
            className={inputClass}
            value={form.defaultOgImage ?? ''}
            placeholder="/uploads/og-cover.png"
            onChange={(event) => setForm({ ...form, defaultOgImage: nullable(event.target.value) })}
          />
        </Field>
        <div className="lg:col-span-2">
          <Field label="默认 SEO 描述" hint="建议 120–160 字符">
            <textarea
              className={`${inputClass} min-h-24 resize-y`}
              value={form.defaultSeoDescription ?? ''}
              maxLength={300}
              onChange={(event) => setForm({ ...form, defaultSeoDescription: nullable(event.target.value) })}
            />
          </Field>
        </div>
      </Section>

      <Section title="互动功能" description="控制读者可使用的站点互动能力。" icon={MessageSquare}>
        <div className="lg:col-span-2">
          <Toggle
            checked={form.commentsEnabled}
            onChange={(commentsEnabled) => setForm({ ...form, commentsEnabled })}
            label="开启文章评论"
            description="关闭后前台隐藏评论区，并拒绝新的评论提交；已审核评论数据仍会保留。"
          />
        </div>
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-medium text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存全部设置
        </button>
      </div>
    </div>
  );
}
