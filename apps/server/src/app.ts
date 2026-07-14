import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { postsRoutes } from './modules/posts/posts.routes';
import { categoriesRoutes, tagsRoutes } from './modules/taxonomies/taxonomies.routes';
import { searchRoutes } from './modules/search/search.routes';
import { archiveRoutes } from './modules/archive/archive.routes';
import { settingsRoutes, adminSettingsRoutes } from './modules/settings/settings.routes';
import { adminRoutes } from './modules/auth/auth.routes';
import { adminPostsRoutes } from './modules/admin-posts/admin-posts.routes';
import { adminCategoriesRoutes, adminTagsRoutes } from './modules/admin-taxonomies/admin-taxonomies.routes';
import { rssRoutes, sitemapRoutes, robotsRoutes } from './modules/seo/seo.routes';
import { adminAssetsRoutes, uploadsRoutes } from './modules/assets/assets.routes';
import { commentsRoutes, adminCommentsRoutes } from './modules/comments/comments.routes';
import { postViewRoutes, adminAnalyticsRoutes } from './modules/analytics/analytics.routes';
import { projectsRoutes, adminProjectsRoutes } from './modules/projects/projects.routes';
import { newsletterRoutes, adminNewsletterRoutes } from './modules/newsletter/newsletter.routes';
import { adminAiRoutes } from './modules/ai/ai.routes';
import { docsRoutes, adminDocsRoutes } from './modules/docs/docs.routes';
import { helpCentersRoutes } from './modules/docs/help-centers.public.routes';
import { adminHelpCentersRoutes } from './modules/docs/help-centers.admin.routes';
import { adminHelpCenterAgentRoutes } from './modules/docs/help-center-agent.routes';

export const app = new Hono();

app.use('*', logger());
app.use('/api/*', cors({ credentials: true }));

app.get('/health', (c) => c.json({ ok: true }));

app.route('/rss.xml', rssRoutes);
app.route('/sitemap.xml', sitemapRoutes);
app.route('/robots.txt', robotsRoutes);

app.route('/api/posts', postsRoutes);
app.route('/api/categories', categoriesRoutes);
app.route('/api/tags', tagsRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/archive', archiveRoutes);
app.route('/api/projects', projectsRoutes);
app.route('/api/help-centers', helpCentersRoutes);
app.route('/api/docs', docsRoutes);
app.route('/api/newsletter', newsletterRoutes);
app.route('/api/site-settings', settingsRoutes);
app.route('/api/admin/settings', adminSettingsRoutes);
app.route('/api/admin/ai', adminAiRoutes);
app.route('/api/admin/posts', adminPostsRoutes);
app.route('/api/admin/help-centers', adminHelpCenterAgentRoutes);
app.route('/api/admin/help-centers', adminHelpCentersRoutes);
app.route('/api/admin/docs', adminDocsRoutes);
app.route('/api/admin/categories', adminCategoriesRoutes);
app.route('/api/admin/tags', adminTagsRoutes);
app.route('/api/admin/projects', adminProjectsRoutes);
app.route('/api/admin/newsletter', adminNewsletterRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/admin/assets', adminAssetsRoutes);
app.route('/api/posts', commentsRoutes);
app.route('/api/admin/comments', adminCommentsRoutes);
app.route('/api/posts', postViewRoutes);
app.route('/api/admin/analytics', adminAnalyticsRoutes);
app.route('/uploads', uploadsRoutes);

app.onError((err, c) => {
  console.error('[error]', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});
