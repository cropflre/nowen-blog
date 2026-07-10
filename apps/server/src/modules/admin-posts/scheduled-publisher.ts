import { sqlite } from '../../db/client';
import { nowIso } from '../../lib/format';
import { indexPost, removePostFromIndex } from '../search/search.service';
import { savePostVersion } from './post-history.service';

interface DuePost {
  id: string;
  title: string;
  summary: string | null;
  contentMd: string;
  visibility: string;
}

/** 发布到期文章。更新条件再次包含 status，确保多实例下只有一个执行者成功。 */
export function publishDuePosts(): number {
  const now = nowIso();
  const due = sqlite
    .prepare(
      `SELECT id, title, summary, content_md AS contentMd, visibility
       FROM posts
       WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= ?
       ORDER BY scheduled_at ASC
       LIMIT 100`,
    )
    .all(now) as DuePost[];

  let published = 0;
  for (const post of due) {
    const result = sqlite
      .prepare(
        `UPDATE posts
         SET status = 'published', published_at = COALESCE(published_at, ?),
             scheduled_at = NULL, updated_at = ?
         WHERE id = ? AND status = 'scheduled'`,
      )
      .run(now, now, post.id);
    if (result.changes === 0) continue;
    published += 1;
    removePostFromIndex(post.id);
    if (post.visibility === 'public') {
      indexPost({ id: post.id, title: post.title, summary: post.summary, contentMd: post.contentMd });
    }
    savePostVersion(post.id, null, 'scheduled_publish');
  }
  return published;
}

export function startScheduledPublisher(): () => void {
  const run = () => {
    try {
      const count = publishDuePosts();
      if (count > 0) console.log(`[scheduler] 已发布 ${count} 篇定时文章`);
    } catch (error) {
      console.error('[scheduler] 定时发布执行失败', error);
    }
  };
  run();
  const timer = setInterval(run, 30_000);
  timer.unref?.();
  return () => clearInterval(timer);
}
