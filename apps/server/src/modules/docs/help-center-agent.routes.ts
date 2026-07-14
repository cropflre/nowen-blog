import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import { parseJson } from './docs.schemas';
import { agentApplySchema, agentRunCreateSchema } from './help-center-agent.schemas';
import {
  applyAgentRun,
  cancelAgentRun,
  createAgentRun,
  getAgentRun,
  listAgentRuns,
} from './help-center-agent.service';

export const adminHelpCenterAgentRoutes = new Hono<{ Variables: { userId: string } }>();
adminHelpCenterAgentRoutes.use('*', authMiddleware);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'AI Agent 操作失败';
}

adminHelpCenterAgentRoutes.get('/:centerId/agent-runs', (c) => {
  const limit = Number(c.req.query('limit') ?? 20);
  return c.json({ items: listAgentRuns(c.req.param('centerId'), limit) });
});

adminHelpCenterAgentRoutes.post('/:centerId/agent-runs', async (c) => {
  const parsed = agentRunCreateSchema.safeParse(await parseJson(c));
  if (!parsed.success) return c.json({ error: '请检查 AI 任务', issues: parsed.error.flatten() }, 400);
  try {
    return c.json(
      await createAgentRun(c.req.param('centerId'), parsed.data, c.get('userId')),
      201,
    );
  } catch (error) {
    const message = errorMessage(error);
    const status = /尚未启用|API|模型|Key|连接/.test(message) ? 400 : /正在生成/.test(message) ? 429 : 400;
    return c.json({ error: message }, status);
  }
});

adminHelpCenterAgentRoutes.get('/:centerId/agent-runs/:runId', (c) => {
  const run = getAgentRun(c.req.param('runId'));
  if (!run || run.helpCenterId !== c.req.param('centerId')) return c.json({ error: 'AI 任务不存在' }, 404);
  return c.json(run);
});

adminHelpCenterAgentRoutes.post('/:centerId/agent-runs/:runId/apply', async (c) => {
  const parsed = agentApplySchema.safeParse(await parseJson(c));
  if (!parsed.success) return c.json({ error: '请选择要应用的变更', issues: parsed.error.flatten() }, 400);
  try {
    return c.json(
      applyAgentRun(
        c.req.param('centerId'),
        c.req.param('runId'),
        parsed.data.changeIds,
        c.get('userId'),
      ),
    );
  } catch (error) {
    return c.json({ error: errorMessage(error) }, 400);
  }
});

adminHelpCenterAgentRoutes.post('/:centerId/agent-runs/:runId/cancel', (c) => {
  try {
    return c.json(cancelAgentRun(c.req.param('centerId'), c.req.param('runId')));
  } catch (error) {
    return c.json({ error: errorMessage(error) }, 400);
  }
});
