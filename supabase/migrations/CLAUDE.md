# migrations/
> L2 | 父级: /supabase/CLAUDE.md

成员清单
20260627000000_agent_workspace.sql: 创建 kyo_items、link_meta、agent_channels、channel_messages、agent_runs、workspace_files，启用 RLS、owner policy、Data API grant 与 service-role grant。
20260627035557_harden_agent_workspace_policies.sql: 删除旧 public policy，收紧 anon/authenticated/service_role 的表级权限。
20260627041016_harden_channel_scope.sql: 收紧 channel_messages 与 agent_runs 的 RLS，要求 channel_id 指向同用户 channel。
20260627043503_harden_function_search_path.sql: 重建 search_items 与 update_updated_at，固定 search_path 为 public，消除函数名解析漂移。
20260627043821_harden_agent_indexes.sql: 补齐 agent 表 user_id 外键索引，保留 kyo_items URL 唯一部分索引，删除旧库重复索引。

架构决策
迁移文件只描述数据库现实，不放应用逻辑。用户数据、agent 可变状态、工具痕迹必须能从这些表审计。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
