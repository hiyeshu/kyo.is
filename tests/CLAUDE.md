# tests/
> L2 | 父级: /CLAUDE.md

成员清单
run-all-tests.ts: 测试统一入口，只运行当前 Cloudflare Worker API 套件，支持按名称筛选。
test-utils.ts: 测试工具，提供 BASE_URL、断言、fetch helper 与结果汇总。
test-worker-api.ts: Worker API 边界测试，覆盖静态资源、SPA fallback、CORS、鉴权、兼容 API 与 501 音频转写占位。

架构决策
tests/ 只验证当前生产入口，不保留已删除 legacy API、旧聊天室、歌词、TTS 或 applet API 的默认测试。没有真实 Supabase session 与 DeepSeek key 时，只验证可证明的边界：未授权、方法限制、输入校验、静态资源与 CORS；成功 agent 对话由远端密钥配置后再做人工或带 token 的黑盒验证。

依赖关系
package.json -> tests/run-all-tests.ts -> tests/test-worker-api.ts -> Cloudflare Worker

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
