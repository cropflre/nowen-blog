import { serve } from '@hono/node-server';
import { app } from './app';
import { initDb } from './db/init';
import { env } from './config/env';

initDb();

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`🚀 Blog API listening on http://localhost:${info.port}`);
});
