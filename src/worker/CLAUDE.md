# worker/
> L2 | 父级: /src/CLAUDE.md

成员清单
env.d.ts: Wrangler 生成的 WorkerBindings 类型，声明 ASSETS、Supabase、DeepSeek binding 名称。
index.ts: Cloudflare Worker fetch 入口，处理 /api、静态资源、无扩展 HTML、SPA fallback、缓存头。
routes.ts: Worker API 路由，处理 agent chat、channel 列表、channel messages，并把空 assistant stream 转成可见完成文案或明确错误。
compatRoutes.ts: Worker 兼容 API 路由，处理 scrape、bookmark-preview、audio-transcribe、save/search/sync/items，并统一前端 camelCase 与数据库 snake_case 字段，包括 orderIndex/order_index。

架构决策
Worker 是生产运行边界，承接 API、静态资源与 SPA fallback。它不直接写业务状态；所有状态变化交给 server/ 数据层或 mastra/tools。binding 名称以 env.d.ts 为语义镜像，env.d.ts 只能由 bun run types:worker 再生成。

依赖关系
worker/ -> server/
worker/routes.ts -> mastra/
worker/compatRoutes.ts -> server/

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
