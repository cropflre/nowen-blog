import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Save, RefreshCw, Eye, EyeOff, Check, Loader2 } from 'lucide-react';
import { api } from '../api';
import type { AISettings } from '../types';

interface AISettingsPanelProps {
  onSave?: () => void;
}

export default function AISettingsPanel({ onSave }: AISettingsPanelProps) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AISettings>({
    ai_api_url: '',
    ai_api_key: '',
    ai_api_key_set: false,
    ai_model: '',
  });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveMsg, setSaveMsg] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAISettings();
      setSettings(data);
      if (data.ai_api_key_set) {
        setApiKeyInput('');
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      await api.updateAISettings({
        ai_api_url: settings.ai_api_url,
        ai_api_key: apiKeyInput || (settings.ai_api_key_set ? undefined : ''),
        ai_model: settings.ai_model,
      });
      setSaveMsg(t('ai.settingsSaved'));
      onSave?.();
      await loadSettings();
    } catch (error) {
      setSaveMsg(t('ai.settingsSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.testAIConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* API URL */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
          {t('ai.apiUrl')}
        </label>
        <input
          type="text"
          value={settings.ai_api_url}
          onChange={(e) => setSettings(prev => ({ ...prev, ai_api_url: e.target.value }))}
          placeholder="https://api.openai.com/v1"
          className="w-full px-4 py-2.5 bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {t('ai.apiUrlHint')}
        </p>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
          {t('ai.apiKey')}
        </label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder={settings.ai_api_key_set ? '••••••••' : 'sk-...'}
            className="w-full px-4 py-2.5 pr-10 bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          >
            {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {settings.ai_api_key_set && (
          <p className="mt-1 text-xs text-emerald-500">
            {t('ai.apiKeyConfigured')}
          </p>
        )}
      </div>

      {/* Model */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
          {t('ai.model')}
        </label>
        <input
          type="text"
          value={settings.ai_model}
          onChange={(e) => setSettings(prev => ({ ...prev, ai_model: e.target.value }))}
          placeholder="gpt-4o-mini"
          className="w-full px-4 py-2.5 bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {t('ai.modelHint')}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span className="text-sm font-mono">{t('ai.save')}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleTest}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-all disabled:opacity-50"
        >
          {testing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          <span className="text-sm font-mono">{t('ai.testConnection')}</span>
        </motion.button>
      </div>

      {/* Save Message */}
      {saveMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg text-sm ${
            saveMsg.includes('Failed') || saveMsg.includes('失败')
              ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
          }`}
        >
          {saveMsg}
        </motion.div>
      )}

      {/* Test Result */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
            testResult.success
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {testResult.success ? <Check size={16} /> : null}
          {testResult.message}
        </motion.div>
      )}
    </div>
  );
}
