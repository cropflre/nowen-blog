import type { AiAction } from './ai.schema';

export const DEFAULT_SYSTEM_PROMPT =
  '你是 NOWEN Blog 的专业中文写作助手。保持事实准确、结构清晰、表达自然。除非用户明确要求，否则使用 Markdown 输出，不编造原文没有的信息，不输出思考过程或额外前缀。';

export const ACTION_PROMPTS: Record<Exclude<AiAction, 'custom'>, string> = {
  title:
    '请根据文章内容生成一个准确、有辨识度且不过度营销的中文标题，建议 12-30 字。只返回标题，不要引号、编号或解释。',
  summary:
    '请为以下博客文章生成一段适合文章列表和分享卡片的中文摘要，控制在 120-220 字，不要编造信息，只返回摘要正文。',
  seo:
    '请生成 SEO 标题和 SEO 描述。严格只返回 JSON：{"seoTitle":"不超过60字","seoDescription":"120到160字"}，不要代码围栏或解释。',
  tags: '请推荐 3-6 个适合这篇文章的标签关键词。只返回逗号分隔的标签，不要加 # 号或解释。',
  outline:
    '请基于文章主题生成一个层级清晰、可直接用于写作的 Markdown 大纲。使用二级和三级标题，并在每个标题下给出一条写作提示。',
  polish: '请润色以下内容，使表达更专业、自然和流畅，保留原意与 Markdown 结构，只返回润色后的文本。',
  rewrite: '请用不同表达方式改写以下内容，保持事实、含义与 Markdown 结构不变，只返回改写后的文本。',
  shorten: '请精简以下内容，删除重复和冗余表达，保留核心事实与结构，只返回精简后的文本。',
  expand: '请扩展以下内容，补充合理的解释、过渡和例子，但不要编造事实，只返回扩展后的文本。',
  continue: '请根据已有上下文自然续写，避免重复，保持当前语言、语气和 Markdown 风格，只返回续写部分。',
  format_markdown:
    '请将以下内容整理为规范 Markdown，合理使用标题、列表、引用、表格和代码块，保持原意，只返回整理后的 Markdown。',
};

export function actionOptions(action: AiAction): { temperature: number; maxTokens: number } {
  if (action === 'title') return { temperature: 0.5, maxTokens: 120 };
  if (action === 'summary') return { temperature: 0.4, maxTokens: 500 };
  if (action === 'seo') return { temperature: 0.2, maxTokens: 400 };
  if (action === 'tags') return { temperature: 0.3, maxTokens: 180 };
  if (action === 'outline') return { temperature: 0.5, maxTokens: 1200 };
  if (action === 'format_markdown') return { temperature: 0.2, maxTokens: 3000 };
  if (action === 'custom') return { temperature: 0.6, maxTokens: 4000 };
  return { temperature: 0.6, maxTokens: 3000 };
}
