# NOWEN Blog

内容型博客 + 轻量 CMS。技术栈：**React + TypeScript + Vite** 前台/后台，**Hono + Drizzle + better-sqlite3** 后端，**Tailwind CSS v4** 视觉系统。

## 结构

```
apps/web      前台 + 管理后台（React）
apps/server   Node API（Hono）
packages/shared  通用类型 + Zod schema
packages/config  共享 tsconfig / prettier
data/         SQLite 数据库 + 上传文件
```

## 开发

```bash
pnpm install
pnpm dev          # 同时启动 web(5173) 与 server(8787)
```

- 前台：http://localhost:5173
- API：http://localhost:8787/api
- Vite 已配置 `/api` 代理到 server，本地无需跨域。

## 构建

```bash
pnpm build
```
