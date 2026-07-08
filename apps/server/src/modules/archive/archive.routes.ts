import { Hono } from 'hono';
import { getArchive } from '../taxonomies/taxonomies.service';

export const archiveRoutes = new Hono();

archiveRoutes.get('/', async (c) => {
  const groups = await getArchive();
  return c.json({ groups });
});
