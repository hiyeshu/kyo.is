# 开发

## 本地开发

```bash
bun install
cp .dev.vars.example .dev.vars
bun run dev
bun run dev:worker
```

打开 `http://localhost:5173`。

## 构建

```bash
bun run check:migration
bun run build
bun run verify:worker
bun run test
bun run types:worker
```

`check:migration` 是迁移门禁：检查 Cloudflare Worker 配置、Supabase/DeepSeek 环境变量名、迁移文件、静态资源大小、旧 provider 入口残留。它不会打印密钥值，只报告缺失的变量名。

`types:worker` 从 `.dev.vars.example` 生成 `src/worker/env.d.ts`。改动 Worker binding 或环境变量名后必须重新运行。

`bun run test` 默认验证当前 Cloudflare Worker API：静态资源、SPA fallback、CORS、未授权、输入校验与兼容 API。旧 serverless API、聊天室、歌词、TTS 测试已经不再是生产入口。

## Cloudflare 部署

```bash
wrangler login
bun run configure:cloudflare-env
bun run types:worker
bun run check:migration
bun run verify:worker
bun run test
bun run deploy:cloudflare
KYO_BASE_URL=https://kyo.is bun run verify:worker
```

部署前需要先完成：

- `wrangler login`
- 本地 `.dev.vars` 或 `.env.local` 包含：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`、`DEEPSEEK_API_KEY`、`SUPABASE_SERVICE_ROLE_KEY`

`configure:cloudflare-env` 会把这四个变量写入 Cloudflare Worker secret，不打印具体值。

## 项目结构

```
src/
  apps/          六个应用模块
  components/    共享组件
  config/        应用注册、主题、壁纸
  hooks/         自定义钩子
  lib/           工具库
  stores/        Zustand 状态
  styles/        全局样式
  types/         类型定义
```

## 规矩

- 所有文本通过 `t()` 函数，不硬编码
- 所有颜色通过 CSS 变量，不硬编码
- 全局状态用 Zustand，局部状态用 `useState`
- 文件系统通过 `useFileSystem` 钩子，不直接碰 IndexedDB
- 函数超过 20 行，反思一下
- 缩进超过 3 层，重构

## 桌面应用

```bash
bun run tauri:dev
bun run tauri:build
```

## 文档

```bash
bun run scripts/generate-docs.ts
```

编辑 `docs/zh/` 或 `docs/en/` 下的 Markdown 文件，运行上述命令，推送即部署。
