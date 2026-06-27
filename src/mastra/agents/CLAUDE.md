# agents/
> L2 | 父级: /src/mastra/CLAUDE.md

成员清单
kyoAgent.ts: Kyo 主 agent 工厂，绑定当前 user/channel/env，使用 DeepSeek v4 flash 与受控 tools。

架构决策
agent 按请求创建，工具闭包携带 userId/channelId/Supabase client，避免模型或全局单例越权。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
