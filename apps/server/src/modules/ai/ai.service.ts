import { sqlite } from '../../db/client';
import { nowIso } from '../../lib/format';
import { callAiCompletion, extractAiTitle, fetchAiModels, type AiClientSettings } from './ai.client';
import { ACTION_PROMPTS, DEFAULT_SYSTEM_PROMPT, actionOptions } from './ai.prompts';
import type { AiAction, AiGenerateInput, AiSettingsUpdate } from './ai.schema';

const NO_KEY_PROVIDERS = new Set(['ollama']);

interface AiSettingsRow {
  enabled: number;
  provider: string;
  apiUrl: string;
  apiKey: string | null;
  model: string;
  systemPrompt: string | null;
  updatedAt: string;
}

export interface AiSettingsView {
  enabled: boolean;
  provider: string;
  apiUrl: string;
  apiKeySet: boolean;
  apiKeyMasked: string | null;
  model: string;
  systemPrompt: string;
  updatedAt: string;
}

export interface AiGeneratedFields {
  title?: string;
  summary?: string;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
}

export interface AiGenerateResult {
  action: AiAction;
  text: string;
  fields?: AiGeneratedFields;
}

export class AiConfigError extends Error {}

const SELECT_SETTINGS = `
  SELECT enabled, provider, api_url AS apiUrl, api_key AS apiKey, model,
         system_prompt AS systemPrompt, updated_at AS updatedAt
  FROM ai_settings WHERE id = 'default' LIMIT 1
`;

export function ensureAiSettings(): void {
  const exists = sqlite.prepare("SELECT 1 FROM ai_settings WHERE id = 'default' LIMIT 1").get();
  if (exists) return;
  sqlite.prepare(`
    INSERT INTO ai_settings (
      id, enabled, provider, api_url, api_key, model, system_prompt, updated_at
    ) VALUES ('default', 0, 'openai', 'https://api.openai.com/v1', NULL, 'gpt-4o-mini', ?, ?)
  `).run(DEFAULT_SYSTEM_PROMPT, nowIso());
}

function getRow(): AiSettingsRow {
  ensureAiSettings();
  const row = sqlite.prepare(SELECT_SETTINGS).get() as AiSettingsRow | undefined;
  if (!row) throw new Error('AI 设置初始化失败');
  return row;
}

function maskApiKey(value: string | null): string | null {
  if (!value) return null;
  return `${'•'.repeat(Math.max(4, Math.min(12, value.length - 4)))}${value.slice(-4)}`;
}

function toView(row: AiSettingsRow): AiSettingsView {
  return {
    enabled: Boolean(row.enabled),
    provider: row.provider,
    apiUrl: row.apiUrl,
    apiKeySet: Boolean(row.apiKey),
    apiKeyMasked: maskApiKey(row.apiKey),
    model: row.model,
    systemPrompt: row.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    updatedAt: row.updatedAt,
  };
}

export function getAiSettings(): AiSettingsView {
  return toView(getRow());
}

export function updateAiSettings(input: AiSettingsUpdate): AiSettingsView {
  const current = getRow();
  const nextKey = input.clearApiKey
    ? null
    : input.apiKey !== undefined && input.apiKey.trim() && !input.apiKey.includes('••')
      ? input.apiKey.trim()
      : current.apiKey;
  sqlite.prepare(`
    UPDATE ai_settings SET enabled = ?, provider = ?, api_url = ?, api_key = ?,
      model = ?, system_prompt = ?, updated_at = ? WHERE id = 'default'
  `).run(
    input.enabled ? 1 : 0,
    input.provider,
    input.apiUrl.replace(/\/+$/, ''),
    nextKey,
    input.model.trim(),
    input.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT,
    nowIso(),
  );
  return getAiSettings();
}

function effectiveSettings(requireEnabled: boolean): AiClientSettings & { systemPrompt: string } {
  const row = getRow();
  if (requireEnabled && !row.enabled) throw new AiConfigError('AI 写作助手尚未启用');
  if (!row.apiUrl.trim()) throw new AiConfigError('AI API 地址未配置');
  if (!row.model.trim()) throw new AiConfigError('AI 模型未配置');
  if (!NO_KEY_PROVIDERS.has(row.provider) && !row.apiKey) throw new AiConfigError('AI API Key 未配置');
  return {
    provider: row.provider,
    apiUrl: row.apiUrl,
    apiKey: row.apiKey,
    model: row.model,
    systemPrompt: row.systemPrompt || DEFAULT_SYSTEM_PROMPT,
  };
}

export async function testAiConnection() {
  const settings = effectiveSettings(false);
  const text = await callAiCompletion(settings, [
    { role: 'system', content: '你是连接测试助手，只回复 OK。' },
    { role: 'user', content: '请回复 OK' },
  ], { temperature: 0, maxTokens: 16, timeoutMs: 20_000 });
  return { success: true as const, message: '连接成功', preview: text.slice(0, 100) };
}

export async function listAiModels(): Promise<string[]> {
  return fetchAiModels(effectiveSettings(false));
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function parseTags(raw: string): string[] {
  return Array.from(new Set(
    raw.replace(/[#*`]/g, '').split(/[,，、\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 8),
  ));
}

function buildFields(action: AiAction, text: string): AiGeneratedFields | undefined {
  if (action === 'title') {
    const title = extractAiTitle(text, 80);
    return title ? { title } : undefined;
  }
  if (action === 'summary') return { summary: text.slice(0, 1000).trim() };
  if (action === 'tags') {
    const tags = parseTags(text);
    return tags.length ? { tags } : undefined;
  }
  if (action === 'seo') {
    const parsed = extractJsonObject(text);
    const seoTitle = typeof parsed?.seoTitle === 'string' ? parsed.seoTitle.trim().slice(0, 200) : '';
    const seoDescription = typeof parsed?.seoDescription === 'string'
      ? parsed.seoDescription.trim().slice(0, 500)
      : '';
    return seoTitle || seoDescription
      ? { ...(seoTitle ? { seoTitle } : {}), ...(seoDescription ? { seoDescription } : {}) }
      : undefined;
  }
  return undefined;
}

export async function generateWithAi(input: AiGenerateInput): Promise<AiGenerateResult> {
  const settings = effectiveSettings(true);
  const instruction = input.action === 'custom'
    ? `${input.customPrompt!.trim()}。直接输出结果，不要解释。`
    : ACTION_PROMPTS[input.action];
  const messages = [
    { role: 'system' as const, content: settings.systemPrompt },
    ...(input.context?.trim()
      ? [{ role: 'system' as const, content: `文章上下文：\n${input.context.trim()}` }]
      : []),
    { role: 'user' as const, content: `${instruction}\n\n---\n${input.text.trim()}` },
  ];
  const options = actionOptions(input.action);
  const text = await callAiCompletion(settings, messages, {
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  });
  return { action: input.action, text, fields: buildFields(input.action, text) };
}
