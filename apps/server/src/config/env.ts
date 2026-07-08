export const env = {
  port: Number(process.env.PORT ?? 8787),
  databasePath: process.env.DATABASE_PATH ?? 'data/blog.sqlite',
  baseUrl: process.env.BASE_URL ?? 'http://localhost:8787',
};
