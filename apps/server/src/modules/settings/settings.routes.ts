import { Hono } from 'hono';
import { siteSettings } from '../../config/site';

export const settingsRoutes = new Hono();

settingsRoutes.get('/', (c) => c.json(siteSettings));
