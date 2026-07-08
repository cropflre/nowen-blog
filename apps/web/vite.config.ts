import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 6688,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      // SEO 端点代理到后端（开发态下前端与 API 不同源）
      '/rss.xml': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/sitemap.xml': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/robots.txt': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
