# supabase/
> L2 | 父级: /CLAUDE.md

成员清单
migrations/ - Supabase SQL migrations，定义 kyo_items、link_meta、agent channel、message、run trace、workspace file 表，固定 public 函数 search_path，并收敛索引边界。

架构决策
Supabase 是产品真相源。kyo_items、Channel、消息、agent run、workspace 文件都必须带 user_id，并用显式 auth.uid() owner policy 约束；消息和 run 还必须指向同用户 channel；link_meta 是公共网页元数据缓存，只允许公开读取，写入由 Worker service-role 完成；public 函数必须固定 search_path，避免名称解析漂移；索引必须服务真实访问路径，重复索引要被删除。

依赖关系
worker/routes.ts -> agent_channels / channel_messages / agent_runs
worker/compatRoutes.ts -> kyo_items / link_meta
mastra/tools -> kyo_items / workspace_files

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
