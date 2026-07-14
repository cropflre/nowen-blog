import { z } from 'zod';

export const agentTaskSchema = z.enum([
  'create_help_center',
  'write_document',
  'audit_help_center',
  'update_from_notes',
]);

export const agentRunCreateSchema = z.object({
  task: agentTaskSchema.default('create_help_center'),
  prompt: z.string().trim().min(3, '请描述希望 AI 完成的文档任务').max(12_000),
  documentId: z.string().trim().nullable().optional(),
});

export const agentApplySchema = z.object({
  changeIds: z.array(z.string().trim().min(1)).max(100).optional(),
});

export type AgentTask = z.infer<typeof agentTaskSchema>;
export type AgentRunCreateInput = z.infer<typeof agentRunCreateSchema>;
