import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { postsRoutes } from './modules/posts/posts.routes';
import { categoriesRoutes, tagsRoutes } from './modules/taxonomies/taxonomies.routes';
import { searchRoutes } from './modules/search/search.routes';
import { archiveRoutes } from './modules/archive/archive.routes';
import { settingsRoutes } from './modules/settings/settings.routes';

export const app = new Hono();

app.use('*', logger());
app.use('/api/*', cors());

app.get('/health', (c) => c.json({ ok: true }));

app.route('/api/posts', postsRoutes);
app.route('/api/categories', categoriesRoutes);
app.route('/api/tags', tagsRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/archive', archiveRoutes);
app.route('/api/site-settings', settingsRoutes);

app.onError((err, c) => {
  console.error('[error]', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});
