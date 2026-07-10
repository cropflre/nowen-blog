import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  CheckCircle2,
  KeyRound,
  Loader2,
  PlugZap,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react';
import { aiApi, type AiProvider, type AiSettingsView } from '../../lib/aiApi';

const PROVIDERS: Array<{
  id: AiProvider;
  name: string;
  apiUrl: string;
  model: string;
  hint: string;
}> = [
  { id: 'openai', name: 'OpenAI', apiUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', hint: 'OpenAI 官方兼容接口' },
  { id: 'deepseek', name: 'DeepSeek', apiUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', hint: 'DeepSeek OpenAI-compatible 接口' },
  { id: 'qwen', name: '通义千问', apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', hint: '阿里云百炼兼容接口' },
  { id: 'doubao', name: '豆包', apiUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: '', hint: '填写火山方舟推理接入点 ID' },
  { id: 'ollama', name: 'Ollama', apiUrl: 'http://localhost:11434/v1', model: 'qwen2.5:7b', hint: '本地模型，无需 API Key' },
  { id: 'custom', name: '自定义', apiUrl: '', model: '', hint: '任何 OpenAI-compatible Chat Completions 服务' },
];

const fieldClass =
  'mt-2 w-full rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-bg-tertiary)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-glow)]';

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
}

export function AdminAISettings() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'ai-settings'], queryFn: aiApi.getSettings });
  const [form, setForm] = useState<AiSettingsView | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [clearApiKey, setClearApiKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  const saveSettings = async (): Promise<AiSettingsView> => {
    if (!form) throw new Error('AI 设置尚未加载');
    const updated = await aiApi.updateSettings({
      enabled: form.enabled,
      provider: form.provider,
      apiUrl: form.apiUrl,
      model: form.model,
      systemPrompt: form.systemPrompt,
      ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      ...(clearApiKey ? { clearApiKey: true } : {}),
    });
    setForm(updated);
    setApiKey('');
    setClearApiKey(false);
    queryClient.setQueryData(['admin', 'ai-settings'], updated);
    return updated;
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      await saveSettings();
      setSuccess('AI 写作设置已保存。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (testing) return;
    setTesting(true);
    setSuccess(null);
    setError(null);
    try {
      await saveSettings();
      const result = await aiApi.testConnection();
      setSuccess(`${result.message}${result.preview ? `：${result.preview}` : ''}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '连接测试失败');
    } finally {
      setTesting(false);
    }
  };

  const loadModels = async () => {
    if (loadingModels) return;
    setLoadingModels(true);
    setSuccess(null);
    setError(null);
    try {
      await saveSettings();
      const result = await aiApi.listModels();
      setModels(result.items);
      setSuccess(result.items.length ? `已读取 ${result.items.length} 个模型。` : '接口未返回可选模型，请手动填写模型名称。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '模型列表读取失败');
    } finally {
      setLoadingModels(false);
    }
  };

  if (query.isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center gap-2 text-muted"><Loader2 className="h-5 w-5 animate-spin" />正在加载 AI 设置…</div>;
  }
  if (query.isError || !form) {
    return <div className="p-8"><div className="rounded-card border border-red-500/30 bg-red-500/10 p-8 text-center text-red-500">AI 设置加载失败：{query.error instanceof Error ? query.error.message : '未知错误'}</div></div>;
  }

  const provider = PROVIDERS.find((item) => item.id === form.provider) ?? PROVIDERS[0];
  const busy = saving || testing || loadingModels;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/15 to-cyan-500/10 p-2 text-violet-500"><Sparkles className="h-5 w-5" /></span>
            <div><h1 className="text-2xl font-bold">AI 写作</h1><p className="mt-1 text-sm text-muted">参考 nowen-note 的 Provider 适配，为博客编辑器提供可控的写作辅助。</p></div>
          </div>
          <p className="mt-2 text-xs text-muted">最后更新：{formatDate(form.updatedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => void loadModels()} className="nowen-button-secondary nowen-focus inline-flex min-h-11 items-center gap-2 px-4 text-sm disabled:opacity-50">
            {loadingModels ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}读取模型
          </button>
          <button type="button" disabled={busy} onClick={() => void testConnection()} className="nowen-button-secondary nowen-focus inline-flex min-h-11 items-center gap-2 px-4 text-sm disabled:opacity-50">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}保存并测试
          </button>
          <button type="button" disabled={busy} onClick={() => void save()} className="nowen-button-primary nowen-focus inline-flex min-h-11 items-center gap-2 px-4 text-sm font-medium disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}保存设置
          </button>
        </div>
      </header>

      {success && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" />{success}</div>}
      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</div>}

      <section className="nowen-surface p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] pb-5">
          <div className="flex items-start gap-3"><span className="rounded-xl bg-violet-500/10 p-2.5 text-violet-500"><Bot className="h-5 w-5" /></span><div><h2 className="font-semibold">模型服务</h2><p className="mt-1 text-sm text-muted">仅管理员可访问。API Key 只保存在服务端，前端读取时始终为掩码。</p></div></div>
          <button type="button" role="switch" aria-checked={form.enabled} onClick={() => setForm({ ...form, enabled: !form.enabled })} className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--color-glass-border)] px-3 text-sm">
            <span className={`relative h-6 w-11 rounded-full transition ${form.enabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${form.enabled ? 'left-6' : 'left-1'}`} /></span>
            {form.enabled ? '已启用' : '已停用'}
          </button>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <label className="block text-sm font-medium">服务商
            <select value={form.provider} onChange={(event) => {
              const next = PROVIDERS.find((item) => item.id === event.target.value as AiProvider);
              if (!next) return;
              setForm({ ...form, provider: next.id, apiUrl: next.apiUrl || form.apiUrl, model: next.model || form.model });
              setModels([]);
            }} className={fieldClass}>
              {PROVIDERS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <span className="mt-2 block text-xs font-normal text-muted">{provider.hint}</span>
          </label>

          <label className="block text-sm font-medium">模型名称
            <input list="ai-model-options" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} placeholder="例如 gpt-4o-mini" className={fieldClass} />
            <datalist id="ai-model-options">{models.map((model) => <option key={model} value={model} />)}</datalist>
          </label>

          <label className="block text-sm font-medium lg:col-span-2">API 基础地址
            <input value={form.apiUrl} onChange={(event) => setForm({ ...form, apiUrl: event.target.value })} placeholder="https://api.example.com/v1" className={fieldClass} />
            <span className="mt-2 block text-xs font-normal text-muted">填写到 `/v1` 层级即可；如果直接填写 `/chat/completions` 也能识别。</span>
          </label>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium">API Key
              <div className="relative"><KeyRound className="pointer-events-none absolute left-4 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-muted" /><input type="password" value={apiKey} onChange={(event) => { setApiKey(event.target.value); setClearApiKey(false); }} placeholder={clearApiKey ? '保存后将清除现有 Key' : form.apiKeyMasked ?? '输入 API Key'} autoComplete="new-password" className={`${fieldClass} pl-11`} /></div>
            </label>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted"><span>{form.apiKeySet && !clearApiKey ? `已配置：${form.apiKeyMasked}` : clearApiKey ? '已标记为清除' : '尚未配置'}</span>{form.apiKeySet && <button type="button" onClick={() => { setApiKey(''); setClearApiKey(!clearApiKey); }} className="text-red-500 hover:underline">{clearApiKey ? '取消清除' : '清除 API Key'}</button>}</div>
          </div>
        </div>
      </section>

      <section className="nowen-surface p-5 lg:p-6">
        <div className="flex items-start gap-3"><span className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-500"><Sparkles className="h-5 w-5" /></span><div><h2 className="font-semibold">系统提示词</h2><p className="mt-1 text-sm text-muted">作为所有文章写作操作的基础约束，可补充你的语气、品牌和事实要求。</p></div></div>
        <label className="mt-5 block text-sm font-medium">默认写作指令
          <textarea rows={7} value={form.systemPrompt} onChange={(event) => setForm({ ...form, systemPrompt: event.target.value })} className={`${fieldClass} resize-y leading-6`} />
        </label>
      </section>

      <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 p-5 text-sm leading-6 text-[var(--color-text-secondary)]">
        <p className="font-medium text-[var(--color-text-primary)]">支持能力</p>
        <p className="mt-2">生成标题、摘要、SEO、标签建议和文章大纲；对选中文本或全文进行润色、改写、精简、扩写、续写、Markdown 排版与自定义处理。所有结果都会先预览，只有点击应用后才修改编辑器。</p>
      </section>
    </div>
  );
}
