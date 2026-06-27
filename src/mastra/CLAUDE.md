# mastra/
> L2 | 父级: /src/CLAUDE.md

成员清单
index.ts: Mastra 模块公共入口，转发 Kyo agent 工厂。
agents/ - agent 定义层，当前只有 Kyo 主 agent。
tools/ - typed tools 层，封装分类、Kyo 数据、workspace 文件系统。

架构决策
Mastra 是 agent loop 和工具编排层，不拥有产品数据。Supabase 是真相源，DeepSeek 是模型供应商，工具是唯一写入入口。

依赖关系
worker/routes -> mastra/index
mastra/agents -> mastra/tools
mastra/tools -> server/

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
