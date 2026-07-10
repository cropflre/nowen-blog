import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, FilePenLine, Loader2, Settings, Sparkles, Wand2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { aiApi, type AiAction, type AiGeneratedFields, type AiGenerateResult } from '../../lib/aiApi';

const ACTIONS: Array<{ id: AiAction; label: string; description: string }> = [
  { id: 'title', label: '生成标题', description: '从正文提炼准确标题' },
  { id: 'summary', label: '生成摘要', description: '生成列表与分享摘要' },
  { id: 'seo', label: '生成 SEO', description: '生成 SEO 标题和描述' },
  { id: 'tags', label: '标签建议', description: '推荐文章关键词' },
  { id: 'outline', label: '生成大纲', description: '生成 Markdown 写作结构' },
  { id: 'polish', label: '润色', description: '提升专业度与流畅性' },
  { id: 'rewrite', label: '改写', description: '保持原意换一种表达' },
  { id: 'shorten', label: '精简', description: '删除重复和冗余' },
  { id: 'expand', label: '扩写', description: '补充解释与过渡' },
  { id: 'continue', label: '续写', description: '沿当前上下文继续写作' },
  { id: 'format_markdown', label: 'Markdown 排版', description: '整理标题、列表和代码块' },
  { id: 'custom', label: '自定义', description: '按你的指令处理内容' },
];

const NON_TEXT_ACTIONS = new Set<AiAction>(['title', 'summary', 'seo', 'tags']);
const FULL_ARTICLE_ACTIONS = new Set<AiAction>(['title', 'summary', 'seo', 'tags', 'outline', 'continue']);

interface AIWritingAssistantProps {
  open: boolean;
  title: string;
  summary: string;
  contentMd: string;
  selectionStart: number;
  selectionEnd: number;
  onClose: () => void;
  onApplyFields: (fields: AiGeneratedFields) => void;
  onReplaceText: (text: string) => void;
  onInsertText: (text: string) => void;
}

export function AIWritingAssistant({
  open,
  title,
  summary,
  contentMd,
  selectionStart,
  selectionEnd,
  onClose,
  onApplyFields,
  onReplaceText,
  onInsertText,
}: AIWritingAssistantProps) {
  const [action, setAction] = useState<AiAction>('polish');
  const [customPrompt, setCustomPrompt] = useState('');
  const [result, setResult] = useState<AiGenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedText = useMemo(
    () => contentMd.slice(Math.max(0, selectionStart), Math.max(selectionStart, selectionEnd)).trim(),
    [contentMd, selectionEnd, selectionStart],
  );

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError(null);
    setCopied(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [loading, onClose, open]);

  if (!open) return null;

  const sourceText = FULL_ARTICLE_ACTIONS.has(action)
    ? contentMd.trim() || summary.trim() || title.trim()
    : selectedText || contentMd.trim();
  const actionMeta = ACTIONS.find((item) => item.id === action)!;
  const canApplyFields = Boolean(
    result?.fields &&
      (result.fields.title || result.fields.summary || result.fields.seoTitle || result.fields.seoDescription),
  );

  const generate = async () => {
    if (!sourceText) {
      setError('请先填写文章正文，或在正文中选中需要处理的内容。');
      return;
    }
    if (action === 'custom' && !customPrompt.trim()) {
      setError('请输入自定义指令。');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const response = await aiApi.generate({
        action,
        text: sourceText,
        context: [`当前标题：${title || '未填写'}`, `当前摘要：${summary || '未填写'}`].join('\n'),
        ...(action === 'custom' ? { customPrompt: customPrompt.trim() } : {}),
      });
      setResult(response);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AI 生成失败');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result?.text) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('复制失败，请手动选择结果文本。');
    }
  };

  const applyFields = () => {
    if (!result?.fields) return;
    onApplyFields(result.fields);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99] flex items-center justify-center p-3 sm:p-6" role="presentation">
      <button type="button" aria-label="关闭 AI 写作助手" onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <section role="dialog" aria-modal="true" aria-labelledby="ai-writing-title" className="relative z-[100] flex h-[min(90vh,780px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--color-glass-border)] bg-[var(--color-bg-secondary)] shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3"><span className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/15 to-cyan-500/10 p-2.5 text-violet-500"><Sparkles className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} /></span><div><h2 id="ai-writing-title" className="font-semibold">AI 写作助手</h2><p className="mt-1 text-sm text-muted">选择操作并预览结果，确认后才会修改文章。</p></div></div>
          <button type="button" onClick={onClose} disabled={loading} aria-label="关闭" className="nowen-icon-button nowen-focus inline-flex h-11 w-11 items-center justify-center disabled:opacity-50"><X className="h-4 w-4" /></button>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-b border-[var(--color-border)] p-4 md:border-b-0 md:border-r">
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">写作操作</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-1">
              {ACTIONS.map((item) => (
                <button key={item.id} type="button" disabled={loading} onClick={() => { setAction(item.id); setResult(null); setError(null); }} className={`nowen-focus rounded-xl border p-3 text-left transition ${action === item.id ? 'border-violet-500/40 bg-gradient-to-r from-violet-500/15 to-cyan-500/10' : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-glass-hover)]'}`}>
                  <span className="block text-sm font-medium">{item.label}</span><span className="mt-1 block text-xs leading-5 text-muted">{item.description}</span>
                </button>
              ))}
            </div>
          </aside>

          <div className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-sm font-semibold">{actionMeta.label}</p><p className="mt-1 text-xs text-muted">{selectedText && !FULL_ARTICLE_ACTIONS.has(action) ? `使用已选中的 ${selectedText.length} 个字符` : '使用当前文章内容'}</p></div>
                <Link to="/admin/ai" className="nowen-button-secondary nowen-focus inline-flex min-h-10 items-center gap-2 px-3 text-xs"><Settings className="h-3.5 w-3.5" />AI 设置</Link>
              </div>

              {action === 'custom' && <label className="mt-5 block text-sm font-medium">自定义指令<textarea value={customPrompt} onChange={(event) => setCustomPrompt(event.target.value)} rows={4} placeholder="例如：把这段内容改写成面向初学者的教程，并增加一个代码示例。" className="nowen-focus mt-2 w-full resize-y rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-bg-tertiary)] px-4 py-3 text-sm leading-6 outline-none focus:border-[var(--color-primary)]" /></label>}

              {error && <div role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">{error}</div>}

              {!result && !loading && <div className="mt-6 rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center"><Wand2 className="mx-auto h-8 w-8 text-violet-500" /><p className="mt-3 text-sm font-medium">准备生成 {actionMeta.label}</p><p className="mt-2 text-xs leading-5 text-muted">AI 输出仅作为草稿。请核对事实、链接、代码和引用后再保存或发布。</p></div>}
              {loading && <div className="mt-6 flex min-h-56 flex-col items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/5"><Loader2 className="h-7 w-7 animate-spin text-violet-500" /><p className="mt-3 text-sm text-muted">正在调用模型生成结果…</p></div>}
              {result && <div className="mt-5"><div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium">生成结果</p>{result.fields?.tags && <div className="flex flex-wrap gap-1">{result.fields.tags.map((tag) => <span key={tag} className="nowen-tag px-2 py-1">{tag}</span>)}</div>}</div><textarea readOnly value={result.text} aria-label="AI 生成结果" className="min-h-72 w-full resize-y rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-bg-tertiary)] p-4 font-mono text-sm leading-7 text-[var(--color-text-primary)] outline-none" /></div>}
            </div>

            <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[var(--color-border)] px-5 py-4 sm:px-6">
              <button type="button" disabled={loading} onClick={() => void generate()} className="nowen-button-primary nowen-focus inline-flex min-h-11 items-center gap-2 px-4 text-sm font-medium disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{result ? '重新生成' : '开始生成'}</button>
              {result && <button type="button" onClick={() => void copy()} className="nowen-button-secondary nowen-focus inline-flex min-h-11 items-center gap-2 px-4 text-sm">{copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}{copied ? '已复制' : '复制结果'}</button>}
              {result && canApplyFields && <button type="button" onClick={applyFields} className="nowen-button-secondary nowen-focus inline-flex min-h-11 items-center gap-2 px-4 text-sm"><Check className="h-4 w-4" />应用到文章字段</button>}
              {result && !NON_TEXT_ACTIONS.has(action) && <><button type="button" onClick={() => { onInsertText(result.text); onClose(); }} className="nowen-button-secondary nowen-focus inline-flex min-h-11 items-center gap-2 px-4 text-sm"><FilePenLine className="h-4 w-4" />插入到光标</button><button type="button" onClick={() => { onReplaceText(result.text); onClose(); }} className="nowen-button-secondary nowen-focus inline-flex min-h-11 items-center gap-2 px-4 text-sm">{selectedText ? '替换选中内容' : '替换全文'}</button></>}
            </footer>
          </div>
        </div>
      </section>
    </div>
  );
}
