import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';
import AISettingsPanel from '../components/AISettingsPanel';

export default function AISettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] p-4 md:p-8 font-mono">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10 border-b border-[var(--color-border-surface)] pb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-wider mb-2 flex items-center gap-3">
            <span className="text-purple-500">&gt;</span>
            <Bot className="text-purple-500" size={28} />
            {t('ai.settings')}
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            <span className="text-[var(--color-text-muted)]">//</span> {t('ai.settingsDescription')}
          </p>
        </div>

        {/* Settings Panel */}
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-surface)] rounded-xl p-6">
          <AISettingsPanel />
        </div>

        {/* Supported Providers */}
        <div className="mt-8 bg-[var(--color-bg-secondary)] border border-[var(--color-border-surface)] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">
            {t('ai.supportedProviders')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'OpenAI', url: 'https://api.openai.com/v1', models: 'GPT-4o, GPT-4o-mini' },
              { name: 'DeepSeek', url: 'https://api.deepseek.com/v1', models: 'DeepSeek-V3, DeepSeek-R1' },
              { name: '通义千问', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: 'Qwen-Turbo, Qwen-Plus' },
              { name: 'Ollama', url: 'http://localhost:11434/v1', models: 'qwen2.5, llama3' },
            ].map((provider) => (
              <div
                key={provider.name}
                className="p-4 bg-[var(--color-bg-card)] border border-[var(--color-border-surface)] rounded-lg"
              >
                <h3 className="font-medium text-[var(--color-text-primary)] mb-1">{provider.name}</h3>
                <p className="text-xs text-[var(--color-text-muted)] mb-1">API: {provider.url}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Models: {provider.models}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
