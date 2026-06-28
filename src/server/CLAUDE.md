# server/
> L2 | 父级: /src/CLAUDE.md

成员清单
types.ts: 共享服务端契约，把 KyoWorkerEnv 绑定到生成的 WorkerBindings，并定义 channel message、tool trace、agent chat request。
http.ts: HTTP 边界工具，统一 JSON、CORS、bearer token、环境变量读取。
supabase.ts: Supabase 入口，创建用户作用域客户端与可选 service-role 服务端客户端。
channels.ts: Channel/message/agent_run 数据层，维护聊天真相源和工具审计记录。
deepseek.ts: DeepSeek 结构化分类器，替代旧打标工作流，把模型 JSON、category 别名和 fallback 字段归一为产品契约。
linkMeta.ts: 链接摄取数据层，LinkMeta API 可失败降级，DeepSeek 继续摘要打标，有 service-role 时写入 link_meta 缓存。

架构决策
server/ 不知道 React，也不持有 UI 状态；它只提供 Worker 和 Mastra 共用的产品边界。Worker env 的 binding 名称由 src/worker/env.d.ts 生成，server/types.ts 只做类型别名不重写。Supabase 是产品真相源，DeepSeek 是模型供应商，Mastra 是工具编排者，LinkMeta 只是网页元数据供应商。服务端缓存写入必须显式拥有 service-role，不允许退化成 anon 写入。

依赖关系
worker/ -> server/
mastra/tools/ -> server/
server/ -> Supabase / DeepSeek

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
