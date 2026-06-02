import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Sparkles, PenLine, RefreshCw, Shrink, Expand, Languages,
  FileText, HelpCircle, Wrench, Copy, Check, X, Loader2,
  ArrowRight, Code2, LetterText, MessageSquarePlus, Send,
} from 'lucide-react';
import { api } from '../api';
import type { AIAction } from '../types';

interface AIWritingAssistantProps {
  selectedText: string;
  fullText: string;
  onInsert: (text: string) => void;
  onReplace: (text: string) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

const ACTION_GROUPS = [
  {
    label: 'write',
    actions: [
      { id: 'continue' as AIAction, icon: ArrowRight, labelKey: 'ai.actionContinue' },
      { id: 'rewrite' as AIAction, icon: PenLine, labelKey: 'ai.actionRewrite' },
      { id: 'polish' as AIAction, icon: Sparkles, labelKey: 'ai.actionPolish' },
    ],
  },
  {
    label: 'edit',
    actions: [
      { id: 'shorten' as AIAction, icon: Shrink, labelKey: 'ai.actionShorten' },
      { id: 'expand' as AIAction, icon: Expand, labelKey: 'ai.actionExpand' },
      { id: 'fix_grammar' as AIAction, icon: Wrench, labelKey: 'ai.actionFixGrammar' },
    ],
  },
  {
    label: 'translate',
    actions: [
      { id: 'translate_zh' as AIAction, icon: Languages, labelKey: 'ai.actionTranslateZh' },
      { id: 'translate_en' as AIAction, icon: Languages, labelKey: 'ai.actionTranslateEn' },
    ],
  },
  {
    label: 'format',
    actions: [
      { id: 'format_markdown' as AIAction, icon: LetterText, labelKey: 'ai.actionFormatMarkdown' },
      { id: 'format_code' as AIAction, icon: Code2, labelKey: 'ai.actionFormatCode' },
    ],
  },
  {
    label: 'other',
    actions: [
      { id: 'summarize' as AIAction, icon: FileText, labelKey: 'ai.actionSummarize' },
      { id: 'explain' as AIAction, icon: HelpCircle, labelKey: 'ai.actionExplain' },
    ],
  },
];

export default function AIWritingAssistant({
  selectedText,
  fullText,
  onInsert,
  onReplace,
  onClose,
  position,
}: AIWritingAssistantProps) {
  const { t } = useTranslation();
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [currentAction, setCurrentAction] = useState<AIAction | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLTextAreaElement>(null);

  const handleAction = useCallback(async (action: AIAction, prompt?: string) => {
    setCurrentAction(action);
    setResult('');
    setError('');
    setIsLoading(true);
    setShowCustomInput(false);

    try {
      await api.aiChat(
        action,
        selectedText,
        fullText.slice(0, 2000),
        (chunk) => {
          setResult(prev => prev + chunk);
        },
        action === 'custom' ? prompt : undefined
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('ai.error');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedText, fullText, t]);

  const handleCustomSubmit = useCallback(() => {
    if (!customPrompt.trim()) return;
    handleAction('custom', customPrompt.trim());
  }, [customPrompt, handleAction]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const getActionLabel = (action: AIAction) => {
    const allActions = ACTION_GROUPS.flatMap(g => g.actions);
    const found = allActions.find(a => a.id === action);
    return found ? t(found.labelKey) : action;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-surface)] rounded-xl shadow-2xl overflow-hidden"
      style={position ? { position: 'fixed', top: position.top, left: position.left, zIndex: 50 } : {}}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-surface)]">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-400" />
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {t('ai.title')}
          </span>
          {currentAction && !isLoading && (
            <span className="text-xs text-[var(--color-text-muted)]">
              · {getActionLabel(currentAction)}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Selected Text Preview */}
      <div className="px-4 py-2 border-b border-[var(--color-border-surface)] bg-[var(--color-bg-primary)]">
        <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">
          {selectedText.slice(0, 200)}{selectedText.length > 200 ? '...' : ''}
        </p>
      </div>

      {/* Action Buttons */}
      {!result && !isLoading && !showCustomInput && (
        <div className="p-3 space-y-3 max-h-[300px] overflow-y-auto">
          {ACTION_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] uppercase text-[var(--color-text-muted)] mb-1.5 px-1">
                {t('ai.group.' + group.label)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <motion.button
                      key={action.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAction(action.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-emerald-500/30 transition-all"
                    >
                      <Icon size={12} />
                      {t(action.labelKey)}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Custom Prompt Button */}
          <button
            onClick={() => {
              setShowCustomInput(true);
              setTimeout(() => customInputRef.current?.focus(), 100);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono w-full justify-center bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-all"
          >
            <MessageSquarePlus size={12} />
            {t('ai.custom')}
          </button>
        </div>
      )}

      {/* Custom Prompt Input */}
      {showCustomInput && !result && !isLoading && (
        <div className="p-3 space-y-2">
          <textarea
            ref={customInputRef}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={t('ai.customPromptPlaceholder')}
            rows={3}
            className="w-full px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowCustomInput(false)}
              className="flex-1 px-3 py-1.5 text-xs font-mono border border-[var(--color-border-surface)] rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              {t('ai.back')}
            </button>
            <button
              onClick={handleCustomSubmit}
              disabled={!customPrompt.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <Send size={12} />
              {t('ai.send')}
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="p-4 flex items-center justify-center">
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">{t('ai.generating')}</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-3 m-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div
            ref={resultRef}
            className="p-4 max-h-[300px] overflow-y-auto text-sm text-[var(--color-text-primary)] whitespace-pre-wrap"
          >
            {result}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 px-4 pb-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onReplace(result)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/20"
            >
              <RefreshCw size={12} />
              {t('ai.replace')}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onInsert(result)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/20"
            >
              <ArrowRight size={12} />
              {t('ai.insert')}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-[var(--color-border-surface)] text-[var(--color-text-muted)] rounded-lg hover:text-[var(--color-text-primary)]"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? t('ai.copied') : t('ai.copy')}
            </motion.button>

            <div className="flex-1" />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setResult('');
                setCurrentAction(null);
                setError('');
              }}
              className="px-3 py-1.5 text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              {t('ai.retry')}
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
