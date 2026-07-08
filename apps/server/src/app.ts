import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { postsRoutes } from './modules/posts/posts.routes';
import { categoriesRoutes, tagsRoutes } from './modules/taxonomies/taxonomies.routes';
import { searchRoutes } from './modules/search/search.routes';
import { archiveRoutes } from './modules/archive/archive.routes';
import { settingsRoutes } from './modules/settings/settings.routes';
import { adminRoutes } from './modules/auth/auth.routes';

export const app = new Hono();

app.use('*', logger());
// 开发时前端经 Vite /api 代理访问，同源，credentials 正常生效。
// 若浏览器直接跨域访问 8787，credentials:true 下 CORS 不能用通配 origin，
// 必须显式配置 origin（如 origin: 'http://localhost:5173'）。
app.use('/api/*', cors({ credentials: true }));

app.get('/health', (c) => c.json({ ok: true }));

app.route('/api/posts', postsRoutes);
app.route('/api/categories', categoriesRoutes);
app.route('/api/tags', tagsRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/archive', archiveRoutes);
app.route('/api/site-settings', settingsRoutes);
app.route('/api/admin', adminRoutes);

app.onError((err, c) => {
  console.error('[error]', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});
