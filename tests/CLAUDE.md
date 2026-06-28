# tests/
> L2 | 父级: /CLAUDE.md

成员清单
run-all-tests.ts: 测试统一入口，运行 Mastra 工具契约、DeepSeek 分类契约、聊天流契约、同步 tombstone 与当前 Cloudflare Worker API 套件，支持按名称筛选。
test-utils.ts: 测试工具，提供 BASE_URL、断言、fetch helper 与结果汇总。
test-kyo-item-tools.ts: Mastra 工具契约测试，mock Supabase query builder，验证 search/upsert/update/delete/reorder 的输入契约、用户作用域与 payload。
test-deepseek-classification.ts: DeepSeek 分类契约测试，验证模型 category 别名归一、怪分类降级 unknown、分类工具失败不抛断 agent loop。
test-chat-stream-contract.ts: 聊天流契约测试，验证空 assistant stream 不会变成空 Kyo 消息，tool-only turn 有可见完成文案，工具错误不会外露内部 JSON。
test-sync-tombstones.ts: 同步删除回归测试，验证 tombstone 迁移、TTL 与远端变更拦截策略。
test-worker-api.ts: Worker API 边界测试，覆盖静态资源、SPA fallback、CORS、鉴权、scrape 降级、兼容 API 与 501 音频转写占位。

架构决策
tests/ 验证当前生产入口、agent 工具契约、同步删除策略与 DeepSeek 分类契约，不保留已删除 legacy API、旧聊天室、歌词、TTS 或 applet API 的默认测试。没有真实 Supabase session 与 DeepSeek key 时，Worker API 只验证可证明的边界：未授权、方法限制、输入校验、静态资源与 CORS；Mastra 工具用 mock Supabase 验证用户作用域与写入 payload；分类测试不打真实模型，只锁住模型输出归一和失败 fallback；同步测试只锁住本地 tombstone 与 Realtime 拦截策略；成功 agent 对话由远端密钥配置后再做人工或带 token 的黑盒验证。

依赖关系
package.json -> tests/run-all-tests.ts -> tests/test-kyo-item-tools.ts -> src/mastra/tools/kyoItemsTool.ts
package.json -> tests/run-all-tests.ts -> tests/test-deepseek-classification.ts -> src/server/deepseek.ts
package.json -> tests/run-all-tests.ts -> tests/test-deepseek-classification.ts -> src/mastra/tools/classifyContentTool.ts
package.json -> tests/run-all-tests.ts -> tests/test-chat-stream-contract.ts -> src/worker/routes.ts
package.json -> tests/run-all-tests.ts -> tests/test-worker-api.ts -> Cloudflare Worker
package.json -> tests/run-all-tests.ts -> tests/test-sync-tombstones.ts -> src/stores/syncTombstones.ts

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
