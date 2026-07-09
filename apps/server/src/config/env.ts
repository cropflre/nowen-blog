export const env = {
  port: Number(process.env.PORT ?? 8787),
  databasePath: process.env.DATABASE_PATH ?? 'data/blog.sqlite',
  baseUrl: process.env.BASE_URL ?? 'http://localhost:8787',
  nodeEnv: (process.env.NODE_ENV ?? 'development').toLowerCase(),
  sessionSecret: process.env.SESSION_SECRET,
  adminUsername: process.env.ADMIN_USERNAME ?? 'NOWEN',
  adminEmail: process.env.ADMIN_EMAIL ?? 'hi@nowen.dev',
  adminPassword: process.env.ADMIN_PASSWORD,
  uploadDir: process.env.UPLOAD_DIR ?? 'data/uploads',
  maxUploadSize: Number(process.env.MAX_UPLOAD_SIZE ?? 5 * 1024 * 1024),
};
