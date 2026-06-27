# tools/
> L2 | 父级: /src/mastra/CLAUDE.md

成员清单
classifyContentTool.ts: Mastra 内容分类工具，调用 DeepSeek 生成 title/summary/tags/category。
kyoItemsTool.ts: Mastra Kyo 数据工具，提供 search/upsert/update/delete/reorder，受控读写当前用户 kyo_items。
workspaceFilesTool.ts: Mastra 文件系统工具，受控读写当前用户 workspace_files。

架构决策
工具是 agent 唯一能改变产品状态的入口。模型只提出结构化意图，工具负责权限、RLS、审计 trace 和真实写入。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
