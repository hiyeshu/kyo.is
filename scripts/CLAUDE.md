# scripts/
> L2 | 父级: /CLAUDE.md

成员清单
build-tauri.ts: Tauri 桌面构建入口，设置 TAURI_ENV 后执行 TypeScript + Vite 构建。
check-migration-readiness.ts: Cloudflare/Supabase/Mastra 迁移门禁，检查配置、env 名称、RLS/函数迁移、agent 工具契约测试、资产大小和遗留入口。
configure-cloudflare-env.ts: Cloudflare Worker 环境配置器，从 .dev.vars/.env.local 读取变量并通过 wrangler secret put 写入，不打印密钥值。
extract-strings.ts: i18n 审计工具，扫描 TSX 硬编码文本并建议翻译 key。
verify-worker-smoke.ts: Worker smoke 验证器，检查静态入口、SPA fallback、API 鉴权、CORS，可用 KYO_BASE_URL 指向远端。
其余 generate/test/build 脚本: 项目资产、文档、图标、测试与发布辅助工具，按 package.json scripts 调用。

架构决策
scripts/ 是构建与维护层，不承载运行时产品逻辑。Cloudflare 迁移后不再保留旧 API symlink、旧 Redis 聊天室 seed 或 legacy 入口脚本；生产入口只由 wrangler.jsonc 与 src/worker 管理。迁移发布前必须先跑 check:migration，把缺失 secrets、旧入口和静态资源超限挡在部署前；Worker binding 类型必须通过 package.json 的 types:worker 从 .dev.vars.example 再生成；配置 Worker 环境必须走 configure:cloudflare-env，避免手工漏配；部署前后必须用 verify:worker 验证入口与 API 边界。

依赖关系
package.json -> scripts/
scripts/ -> src/ / public/ / docs/

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
