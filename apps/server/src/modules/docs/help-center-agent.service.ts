import { sqlite } from '../../db/client';
import { nowIso, randomId } from '../../lib/format';
import { generateWithAi } from '../ai/ai.service';
import {
  createRedirect,
  getDocumentById,
  moveDescendants,
  saveRevision,
} from './docs.service';
import {
  buildHelpCenterDocumentPath,
  documentHasChildren,
  getHelpCenterById,
  listHelpCenterDocuments,
  nextHelpCenterSortOrder,
} from './help-centers.service';
import type { DocumentRow } from './docs.types';
import type { AgentRunCreateInput } from './help-center-agent.schemas';

interface AgentRunRow {
  id: string;
  helpCenterId: string;
  task: string;
  prompt: string;
  status: string;
  summary: string | null;
  error: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface AgentStepRow {
  id: string;
  runId: string;
  stepOrder: number;
  title: string;
  status: string;
  detail: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AgentChangeRow {
  id: string;
  runId: string;
  action: string;
  documentId: string | null;
  parentTitle: string | null;
  title: string;
  description: string | null;
  contentMd: string;
  sortOrder: number;
  status: string;
  createdAt: string;
  appliedAt: string | null;
}

interface PlannedDocument {
  title: string;
  parentTitle: string | null;
  description: string | null;
  contentMd: string;
}

const RUN_SELECT = `
  SELECT id, help_center_id AS helpCenterId, task, prompt, status, summary, error,
         created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt,
         completed_at AS completedAt
  FROM ai_agent_runs
`;

const STEP_SELECT = `
  SELECT id, run_id AS runId, step_order AS stepOrder, title, status, detail,
         created_at AS createdAt, updated_at AS updatedAt
  FROM ai_agent_steps
`;

const CHANGE_SELECT = `
  SELECT id, run_id AS runId, action, document_id AS documentId,
         parent_title AS parentTitle, title, description, content_md AS contentMd,
         sort_order AS sortOrder, status, created_at AS createdAt, applied_at AS appliedAt
  FROM ai_agent_changes
`;

function normalizeTitle(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN');
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI 没有返回可识别的文档方案');
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AI 返回的文档方案格式不正确');
  }
  return parsed as Record<string, unknown>;
}

function normalizePlan(raw: string): { summary: string; documents: PlannedDocument[] } {
  const parsed = parseJsonObject(raw);
  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim().slice(0, 2000) : 'AI 已生成待审核文档方案。';
  if (!Array.isArray(parsed.documents)) throw new Error('AI 文档方案缺少 documents 数组');

  const documents = parsed.documents
    .slice(0, 30)
    .map((item): PlannedDocument | null => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const value = item as Record<string, unknown>;
      const title = typeof value.title === 'string' ? value.title.trim().slice(0, 240) : '';
      if (!title) return null;
      const parentTitle = typeof value.parentTitle === 'string' && value.parentTitle.trim()
        ? value.parentTitle.trim().slice(0, 240)
        : null;
      const description = typeof value.description === 'string' && value.description.trim()
        ? value.description.trim().slice(0, 1000)
        : null;
      let contentMd = typeof value.contentMd === 'string' ? value.contentMd.trim().slice(0, 60_000) : '';
      if (!contentMd) contentMd = `# ${title}\n\n> 需要管理员补充准确内容。`;
      return { title, parentTitle, description, contentMd };
    })
    .filter((item): item is PlannedDocument => Boolean(item));

  if (!documents.length) throw new Error('AI 没有生成可用的帮助文档');

  const roots = new Set(documents.filter((item) => !item.parentTitle).map((item) => normalizeTitle(item.title)));
  for (const item of documents) {
    if (item.parentTitle && normalizeTitle(item.parentTitle) === normalizeTitle(item.title)) {
      throw new Error(`AI 生成的“${item.title}”不能把自己作为父栏目`);
    }
    if (item.parentTitle && documents.some(
      (candidate) => normalizeTitle(candidate.title) === normalizeTitle(item.parentTitle) && candidate.parentTitle,
    )) {
      throw new Error(`AI 生成了超过两级的目录：${item.parentTitle} / ${item.title}`);
    }
  }

  return { summary, documents };
}

function buildContext(centerId: string, versionId: string, selectedDocumentId?: string | null): string {
  const center = getHelpCenterById(centerId);
  const documents = listHelpCenterDocuments(centerId, versionId, false);
  const byId = new Map(documents.map((item) => [item.id, item]));
  const selected = selectedDocumentId ? byId.get(selectedDocumentId) : null;
  const lines: string[] = [
    `项目名称：${center?.name ?? ''}`,
    `项目介绍：${center?.description ?? '未填写'}`,
    '',
    '现有目录：',
  ];

  for (const document of documents) {
    const parent = document.parentId ? byId.get(document.parentId) : null;
    lines.push(`${document.parentId ? '  -' : '-'} ${parent ? `${parent.title} / ` : ''}${document.title}（${document.status}）`);
  }

  if (selected) {
    lines.push('', '当前正在编辑的文档：', `标题：${selected.title}`, `说明：${selected.description ?? '无'}`, selected.contentMd.slice(0, 12_000));
  }

  lines.push('', '现有文档正文摘要：');
  let remaining = 34_000;
  for (const document of documents) {
    if (remaining <= 0) break;
    const excerpt = document.contentMd.slice(0, Math.min(3500, remaining));
    lines.push(`\n## ${document.title}\n${excerpt}`);
    remaining -= excerpt.length;
  }
  return lines.join('\n').slice(0, 48_000);
}

function agentInstruction(task: string): string {
  const taskHint: Record<string, string> = {
    create_help_center: '根据项目介绍规划完整的新手帮助中心。',
    write_document: '重点完成当前文档，必要时可补充直接相关的栏目或文章。',
    audit_help_center: '检查现有内容的缺失、重复、难懂和步骤不完整问题，并给出需要新增或重写的文档。',
    update_from_notes: '根据管理员提供的更新说明，判断需要新增或修改哪些文档。',
  };
  return [
    '你是帮助中心 AI Agent。',
    taskHint[task] ?? taskHint.create_help_center,
    '面向完全不懂技术的普通用户，步骤短、明确、可照着操作。',
    '只能生成一级栏目和二级文章，parentTitle 只能指向一级栏目。',
    '不得虚构按钮、功能、配置、命令或路径；不确定的信息用“需要管理员确认”标记。',
    '不要删除正式文档，不要发布内容。',
    '严格只返回 JSON，不要代码围栏、解释或额外文字。',
    '格式：{"summary":"方案摘要","documents":[{"title":"标题","parentTitle":null,"description":"一句话说明","contentMd":"# 标题\\n\\n正文"}]}',
    '最多返回 24 篇文档。',
  ].join('\n');
}

function insertSteps(runId: string, now: string): void {
  const insert = sqlite.prepare(
    `INSERT INTO ai_agent_steps (id, run_id, step_order, title, status, detail, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
  );
  insert.run(randomId('aist_'), runId, 1, '读取项目和现有文档', 'pending', now, now);
  insert.run(randomId('aist_'), runId, 2, '生成文档方案和草稿', 'pending', now, now);
  insert.run(randomId('aist_'), runId, 3, '等待管理员审核应用', 'pending', now, now);
}

function setStep(runId: string, order: number, status: string, detail?: string | null): void {
  sqlite
    .prepare('UPDATE ai_agent_steps SET status = ?, detail = ?, updated_at = ? WHERE run_id = ? AND step_order = ?')
    .run(status, detail ?? null, nowIso(), runId, order);
}

function setRun(runId: string, status: string, values: { summary?: string | null; error?: string | null; completed?: boolean } = {}): void {
  const now = nowIso();
  sqlite
    .prepare(
      `UPDATE ai_agent_runs SET status = ?, summary = COALESCE(?, summary), error = ?,
       updated_at = ?, completed_at = ? WHERE id = ?`,
    )
    .run(status, values.summary ?? null, values.error ?? null, now, values.completed ? now : null, runId);
}

export function getAgentRun(runId: string) {
  const run = sqlite.prepare(`${RUN_SELECT} WHERE id = ? LIMIT 1`).get(runId) as AgentRunRow | undefined;
  if (!run) return null;
  const steps = sqlite.prepare(`${STEP_SELECT} WHERE run_id = ? ORDER BY step_order ASC`).all(runId) as AgentStepRow[];
  const changes = sqlite.prepare(`${CHANGE_SELECT} WHERE run_id = ? ORDER BY sort_order ASC, created_at ASC`).all(runId) as AgentChangeRow[];
  return { ...run, steps, changes };
}

export function listAgentRuns(helpCenterId: string, limit = 20) {
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  return sqlite
    .prepare(`${RUN_SELECT} WHERE help_center_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(helpCenterId, safeLimit) as AgentRunRow[];
}

export async function createAgentRun(helpCenterId: string, input: AgentRunCreateInput, userId: string) {
  const center = getHelpCenterById(helpCenterId);
  if (!center?.helpCenterVersionId) throw new Error('帮助中心不存在');
  if (input.documentId) {
    const selected = getDocumentById(input.documentId);
    if (!selected || selected.spaceId !== center.id) throw new Error('当前文档不存在');
  }
  const active = sqlite
    .prepare("SELECT id FROM ai_agent_runs WHERE help_center_id = ? AND status IN ('planning', 'generating') LIMIT 1")
    .get(helpCenterId);
  if (active) throw new Error('这个帮助中心已有 AI 任务正在生成，请稍后再试');

  const runId = randomId('airun_');
  const now = nowIso();
  sqlite
    .prepare(
      `INSERT INTO ai_agent_runs (
        id, help_center_id, task, prompt, status, summary, error, created_by,
        created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, 'planning', NULL, NULL, ?, ?, ?, NULL)`,
    )
    .run(runId, helpCenterId, input.task, input.prompt, userId, now, now);
  insertSteps(runId, now);

  try {
    setStep(runId, 1, 'running');
    const context = buildContext(helpCenterId, center.helpCenterVersionId, input.documentId);
    setStep(runId, 1, 'completed', `已读取 ${listHelpCenterDocuments(helpCenterId, center.helpCenterVersionId, false).length} 篇现有文档`);
    setRun(runId, 'generating');
    setStep(runId, 2, 'running');

    const response = await generateWithAi({
      action: 'custom',
      text: [`管理员需求：${input.prompt}`, '', context].join('\n'),
      context: `当前帮助中心：${center.name}`,
      customPrompt: agentInstruction(input.task),
    });
    const plan = normalizePlan(response.text);
    const existing = listHelpCenterDocuments(helpCenterId, center.helpCenterVersionId, false);
    const existingByTitle = new Map(existing.map((item) => [normalizeTitle(item.title), item]));
    const knownRoots = new Set(existing.filter((item) => !item.parentId).map((item) => normalizeTitle(item.title)));
    for (const item of plan.documents) if (!item.parentTitle) knownRoots.add(normalizeTitle(item.title));
    for (const item of plan.documents) {
      if (item.parentTitle && !knownRoots.has(normalizeTitle(item.parentTitle))) {
        throw new Error(`AI 为“${item.title}”指定的一级栏目“${item.parentTitle}”不存在`);
      }
    }

    const insert = sqlite.prepare(
      `INSERT INTO ai_agent_changes (
        id, run_id, action, document_id, parent_title, title, description,
        content_md, sort_order, status, created_at, applied_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NULL)`,
    );
    const transaction = sqlite.transaction(() => {
      plan.documents.forEach((item, index) => {
        const current = existingByTitle.get(normalizeTitle(item.title));
        insert.run(
          randomId('aichg_'),
          runId,
          current ? 'update' : 'create',
          current?.id ?? null,
          item.parentTitle,
          item.title,
          item.description,
          item.contentMd,
          index * 10,
          nowIso(),
        );
      });
      setStep(runId, 2, 'completed', `已生成 ${plan.documents.length} 项待审核变更`);
      setStep(runId, 3, 'waiting', '请在后台逐项检查后应用，所有内容默认保存为草稿');
      setRun(runId, 'reviewing', { summary: plan.summary });
    });
    transaction();
    return getAgentRun(runId)!;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI Agent 执行失败';
    setStep(runId, 2, 'failed', message);
    setRun(runId, 'failed', { error: message, completed: true });
    throw error;
  }
}

function resolveRootByTitle(
  title: string | null,
  roots: Map<string, DocumentRow>,
): DocumentRow | null {
  if (!title) return null;
  return roots.get(normalizeTitle(title)) ?? null;
}

export function applyAgentRun(helpCenterId: string, runId: string, changeIds: string[] | undefined, userId: string) {
  const run = getAgentRun(runId);
  const center = getHelpCenterById(helpCenterId);
  if (!run || run.helpCenterId !== helpCenterId) throw new Error('AI 任务不存在');
  if (!center?.helpCenterVersionId) throw new Error('帮助中心不存在');
  if (!['reviewing', 'completed'].includes(run.status)) throw new Error('这个 AI 任务还不能应用');

  const selected = run.changes.filter(
    (change) => change.status === 'pending' && (!changeIds?.length || changeIds.includes(change.id)),
  );
  if (!selected.length) return run;

  const transaction = sqlite.transaction(() => {
    const currentDocuments = listHelpCenterDocuments(helpCenterId, center.helpCenterVersionId!, false);
    const roots = new Map(
      currentDocuments.filter((item) => !item.parentId).map((item) => [normalizeTitle(item.title), item]),
    );
    const ordered = [...selected].sort((a, b) => Number(Boolean(a.parentTitle)) - Number(Boolean(b.parentTitle)) || a.sortOrder - b.sortOrder);

    for (const change of ordered) {
      const parent = resolveRootByTitle(change.parentTitle, roots);
      if (change.parentTitle && !parent) throw new Error(`一级栏目“${change.parentTitle}”不存在，无法应用“${change.title}”`);

      let document = change.documentId ? getDocumentById(change.documentId) : null;
      if (document && document.spaceId !== helpCenterId) document = null;

      if (!document) {
        const id = randomId('doc_');
        const pathInfo = buildHelpCenterDocumentPath(center.helpCenterVersionId!, change.title, parent);
        const now = nowIso();
        sqlite
          .prepare(
            `INSERT INTO documents (
              id, space_id, version_id, parent_id, title, slug, path, description,
              content_md, status, visibility, sort_order, depth, source_type,
              source_path, source_sha, edit_url, seo_title, seo_description,
              published_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'public', ?, ?, 'ai',
              NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`,
          )
          .run(
            id,
            helpCenterId,
            center.helpCenterVersionId,
            parent?.id ?? null,
            change.title,
            pathInfo.slug,
            pathInfo.path,
            change.description,
            change.contentMd,
            nextHelpCenterSortOrder(center.helpCenterVersionId!, parent?.id ?? null),
            parent ? 1 : 0,
            now,
            now,
          );
        document = getDocumentById(id);
      } else {
        if (parent && documentHasChildren(document.id)) {
          throw new Error(`“${document.title}”下面还有文章，不能移动到其他栏目`);
        }
        const pathInfo = buildHelpCenterDocumentPath(document.versionId, change.title, parent, document.id);
        const nextDepth = parent ? 1 : 0;
        saveRevision(document, userId, 'ai_agent');
        sqlite
          .prepare(
            `UPDATE documents SET parent_id = ?, title = ?, slug = ?, path = ?,
              description = ?, content_md = ?, status = 'draft', visibility = 'public',
              depth = ?, source_type = 'ai', source_path = NULL, source_sha = NULL,
              edit_url = NULL, published_at = NULL, updated_at = ? WHERE id = ?`,
          )
          .run(
            parent?.id ?? null,
            change.title,
            pathInfo.slug,
            pathInfo.path,
            change.description,
            change.contentMd,
            nextDepth,
            nowIso(),
            document.id,
          );
        if (pathInfo.path !== document.path) createRedirect(document, pathInfo.path);
        if (pathInfo.path !== document.path || nextDepth !== document.depth) {
          moveDescendants(document, pathInfo.path, nextDepth);
        }
        document = getDocumentById(document.id);
      }

      if (!document) throw new Error(`应用“${change.title}”失败`);
      if (!document.parentId) roots.set(normalizeTitle(document.title), document);
      sqlite
        .prepare("UPDATE ai_agent_changes SET status = 'applied', document_id = ?, applied_at = ? WHERE id = ?")
        .run(document.id, nowIso(), change.id);
    }

    const pending = sqlite
      .prepare("SELECT COUNT(*) AS total FROM ai_agent_changes WHERE run_id = ? AND status = 'pending'")
      .get(runId) as { total: number };
    if (pending.total === 0) {
      setStep(runId, 3, 'completed', '全部变更已应用为草稿，请逐篇确认后发布');
      setRun(runId, 'completed', { completed: true });
    } else {
      setStep(runId, 3, 'waiting', `仍有 ${pending.total} 项变更等待审核`);
      setRun(runId, 'reviewing');
    }
  });

  transaction();
  return getAgentRun(runId)!;
}

export function cancelAgentRun(helpCenterId: string, runId: string) {
  const run = getAgentRun(runId);
  if (!run || run.helpCenterId !== helpCenterId) throw new Error('AI 任务不存在');
  const transaction = sqlite.transaction(() => {
    sqlite
      .prepare("UPDATE ai_agent_changes SET status = 'dismissed' WHERE run_id = ? AND status = 'pending'")
      .run(runId);
    setStep(runId, 3, 'cancelled', '管理员已放弃这次任务');
    setRun(runId, 'cancelled', { completed: true });
  });
  transaction();
  return getAgentRun(runId)!;
}
