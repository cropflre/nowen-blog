export interface AiClientSettings {
  provider: string;
  apiUrl: string;
  apiKey: string | null;
  model: string;
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

const FINAL_MARKER_RE = /(?:^|\n)\s*(最终答案|最终标题|标题|答案|Final|Answer|Result)\s*[:：]\s*/gi;
const QUOTE_RE = /^[\s"'“”‘’「」『』《》#*`\-:：]+|[\s"'“”‘’「」『』《》#*`\-:：。.!！?？]+$/g;

function isLikelyReasoningLine(line: string): boolean {
  const value = line.trim();
  if (!value) return false;
  return [
    /^思考过程\s*[:：]?/,
    /^推理过程\s*[:：]?/,
    /^分析过程\s*[:：]?/,
    /^首先[，,].*(用户|我需要|我们需要|要求)/,
    /^用户(要求|想要|希望|需要)/,
    /^我(需要|会|应该|将|先|可以)/,
    /^我们(需要|可以|应该|先)/,
    /^接下来[，,]/,
    /^根据(用户|提供的|以上)/,
  ].some((pattern) => pattern.test(value));
}

export function stripAiReasoning(raw: string): string {
  if (!raw) return '';
  let text = String(raw).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  text = text.replace(/<\s*(think|reasoning|思考|推理)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  text = text.replace(
    /<\s*(think|reasoning|思考|推理)[^>]*>[\s\S]*?(?=(?:最终答案|最终标题|标题|答案|Final|Answer|Result)\s*[:：]|$)/gi,
    '',
  );
  text = text.replace(/<\s*\/\s*(think|reasoning|思考|推理)\s*>/gi, '');
  text = text.replace(/```\s*(think|reasoning|思考|推理)[\s\S]*?```/gi, '');
  text = text.replace(
    /(?:^|\n)\s*(思考过程|推理过程|分析过程)\s*[:：][\s\S]*?(?=(?:\n\s*)?(最终答案|最终标题|标题|答案|Final|Answer|Result)\s*[:：])/gi,
    '\n',
  );
  return text
    .split('\n')
    .filter((line) => !isLikelyReasoningLine(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractFinalAnswer(raw: string): string {
  const stripped = stripAiReasoning(raw);
  if (!stripped) return '';
  let match: RegExpExecArray | null;
  let lastEnd = -1;
  FINAL_MARKER_RE.lastIndex = 0;
  while ((match = FINAL_MARKER_RE.exec(stripped)) !== null) {
    lastEnd = FINAL_MARKER_RE.lastIndex;
  }
  return stripAiReasoning(lastEnd >= 0 ? stripped.slice(lastEnd) : stripped).trim();
}

function cleanOneLine(value: string): string {
  return value
    .replace(/^\s*(最终标题|标题|最终答案|答案|Final|Answer|Result)\s*[:：]\s*/i, '')
    .replace(/^#+\s*/, '')
    .replace(QUOTE_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractAiTitle(raw: string, maxLength = 80): string {
  const answer = extractFinalAnswer(raw);
  const candidates = answer
    .split(/\n+/)
    .map(cleanOneLine)
    .filter(Boolean)
    .filter((line) => !isLikelyReasoningLine(line));
  let title = candidates[0] || cleanOneLine(answer);
  title = title
    .replace(/^这篇文章(主要)?(讲述|介绍|讨论|关于)/, '')
    .replace(/^根据内容(可知|来看)?/, '')
    .replace(/^可以命名为/, '')
    .replace(/^建议标题为/, '');
  const sentence = title.split(/[。.!！?？；;]/).find((part) => part.trim()) || title;
  title = cleanOneLine(sentence);
  return title.length > maxLength ? title.slice(0, maxLength) : title;
}

function readContentPart(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value
    .map((part) => {
      if (typeof part === 'string') return part;
      if (!part || typeof part !== 'object') return '';
      const object = part as Record<string, unknown>;
      if (typeof object.text === 'string') return object.text;
      if (typeof object.content === 'string') return object.content;
      return '';
    })
    .join('');
}

export function extractTextFromCompletion(data: Record<string, unknown>): string {
  const choices = data.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const choice = choices[0] as Record<string, unknown>;
    const message = choice.message;
    if (message && typeof message === 'object') {
      const content = readContentPart((message as Record<string, unknown>).content);
      if (content) return content;
    }
    const text = readContentPart(choice.text);
    if (text) return text;
  }

  if (typeof data.output_text === 'string') return data.output_text;
  if (typeof data.response === 'string') return data.response;
  if (typeof data.content === 'string') return data.content;

  const message = data.message;
  if (message && typeof message === 'object') {
    const content = readContentPart((message as Record<string, unknown>).content);
    if (content) return content;
  }

  const candidates = data.candidates;
  if (Array.isArray(candidates) && candidates.length > 0) {
    const first = candidates[0] as Record<string, unknown>;
    const content = first.content;
    if (content && typeof content === 'object') {
      const text = readContentPart((content as Record<string, unknown>).parts);
      if (text) return text;
    }
  }

  return '';
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/i, '');
}

function chatEndpoint(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  return /\/chat\/completions$/i.test(trimmed) ? trimmed : `${trimmed}/chat/completions`;
}

function sanitizeError(value: string, apiKey: string | null): string {
  let result = value.replace(/[\r\n\t]+/g, ' ').trim();
  if (apiKey) result = result.split(apiKey).join('[REDACTED]');
  return result.slice(0, 800);
}

function requestHeaders(settings: AiClientSettings): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;
  return headers;
}

export async function callAiCompletion(
  settings: AiClientSettings,
  messages: AiMessage[],
  options: AiCompletionOptions = {},
): Promise<string> {
  const response = await fetch(chatEndpoint(settings.apiUrl), {
    method: 'POST',
    headers: requestHeaders(settings),
    body: JSON.stringify({
      model: settings.model,
      messages,
      stream: false,
      ...(options.temperature === undefined ? {} : { temperature: options.temperature }),
      ...(options.maxTokens === undefined ? {} : { max_tokens: options.maxTokens }),
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 60_000),
  });

  if (!response.ok) {
    const detail = sanitizeError(await response.text().catch(() => ''), settings.apiKey);
    throw new Error(`AI 服务错误 (${settings.provider})：${response.status}${detail ? ` ${detail}` : ''}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const text = extractFinalAnswer(extractTextFromCompletion(data));
  if (!text) throw new Error('AI 服务连接成功，但没有返回可用文本');
  return text;
}

export async function fetchAiModels(settings: AiClientSettings): Promise<string[]> {
  const response = await fetch(`${normalizeBaseUrl(settings.apiUrl)}/models`, {
    headers: requestHeaders(settings),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const detail = sanitizeError(await response.text().catch(() => ''), settings.apiKey);
    throw new Error(`模型列表读取失败：${response.status}${detail ? ` ${detail}` : ''}`);
  }
  const data = (await response.json()) as Record<string, unknown>;
  const raw = Array.isArray(data.data) ? data.data : Array.isArray(data.models) ? data.models : [];
  return Array.from(
    new Set(
      raw
        .map((item) => {
          if (typeof item === 'string') return item;
          if (!item || typeof item !== 'object') return '';
          const object = item as Record<string, unknown>;
          return typeof object.id === 'string'
            ? object.id
            : typeof object.name === 'string'
              ? object.name
              : '';
        })
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}
