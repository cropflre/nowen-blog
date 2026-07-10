import { z } from 'zod';

export const aiProviderSchema = z.enum([
  'openai',
  'deepseek',
  'qwen',
  'doubao',
  'ollama',
  'custom',
]);

const apiUrlSchema = z
  .string()
  .trim()
  .min(1, 'API 地址必填')
  .max(500)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'API 地址必须是有效的 HTTP(S) URL');

export const aiSettingsUpdateSchema = z.object({
  enabled: z.boolean(),
  provider: aiProviderSchema,
  apiUrl: apiUrlSchema,
  apiKey: z.string().max(1000).optional(),
  clearApiKey: z.boolean().optional(),
  model: z.string().trim().max(200),
  systemPrompt: z.string().max(4000).nullable().optional(),
});

export type AiSettingsUpdate = z.infer<typeof aiSettingsUpdateSchema>;

export const aiActionSchema = z.enum([
  'title',
  'summary',
  'seo',
  'tags',
  'outline',
  'polish',
  'rewrite',
  'shorten',
  'expand',
  'continue',
  'format_markdown',
  'custom',
]);

export type AiAction = z.infer<typeof aiActionSchema>;

export const aiGenerateSchema = z
  .object({
    action: aiActionSchema,
    text: z.string().trim().min(1, '请先提供文章内容').max(60_000),
    context: z.string().max(12_000).optional(),
    customPrompt: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === 'custom' && !value.customPrompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customPrompt'],
        message: '自定义操作必须填写指令',
      });
    }
  });

export type AiGenerateInput = z.infer<typeof aiGenerateSchema>;
