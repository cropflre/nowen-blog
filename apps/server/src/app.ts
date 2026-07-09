import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { postsRoutes } from './modules/posts/posts.routes';
import { categoriesRoutes, tagsRoutes } from './modules/taxonomies/taxonomies.routes';
import { searchRoutes } from './modules/search/search.routes';
import { archiveRoutes } from './modules/archive/archive.routes';
import { settingsRoutes } from './modules/settings/settings.routes';
import { adminRoutes } from './modules/auth/auth.routes';
import { adminPostsRoutes } from './modules/admin-posts/admin-posts.routes';
import { adminCategoriesRoutes, adminTagsRoutes } from './modules/admin-taxonomies/admin-taxonomies.routes';
import { rssRoutes, sitemapRoutes, robotsRoutes } from './modules/seo/seo.routes';
import { adminAssetsRoutes, uploadsRoutes } from './modules/assets/assets.routes';

export const app = new Hono();

app.use('*', logger());
// 开发时前端经 Vite /api 代理访问，同源，credentials 正常生效。
// 若浏览器直接跨域访问 8787，credentials:true 下 CORS 不能用通配 origin，
// 必须显式配置 origin（如 origin: 'http://localhost:5173'）。
app.use('/api/*', cors({ credentials: true }));

app.get('/health', (c) => c.json({ ok: true }));

// SEO 相关接口直接挂在根路径（非 /api）
app.route('/rss.xml', rssRoutes);
app.route('/sitemap.xml', sitemapRoutes);
app.route('/robots.txt', robotsRoutes);

app.route('/api/posts', postsRoutes);
app.route('/api/categories', categoriesRoutes);
app.route('/api/tags', tagsRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/archive', archiveRoutes);
app.route('/api/site-settings', settingsRoutes);
app.route('/api/admin/posts', adminPostsRoutes);
app.route('/api/admin/categories', adminCategoriesRoutes);
app.route('/api/admin/tags', adminTagsRoutes);
app.route('/api/admin', adminRoutes);

// 媒体库管理接口
app.route('/api/admin/assets', adminAssetsRoutes);

// 开发环境（及生产静态层备选）暴露上传文件 /uploads
app.route('/uploads', uploadsRoutes);

app.onError((err, c) => {
  console.error('[error]', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});
