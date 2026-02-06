# _api/pusher/
> L2 | 父级: /_api/CLAUDE.md

## 成员清单

broadcast.ts: Pusher 广播端点，服务端触发 Pusher 事件，广播消息到指定频道

## 依赖关系
- 依赖 Pusher 服务端 SDK
- 依赖 _utils/auth 认证验证
- 被其他 API 端点调用

## Pusher 约束
1. 频道命名规范：public-*（公开）、private-*（私有）、presence-*（在线状态）
2. 私有频道必须验证用户权限
3. 事件名称必须清晰描述事件类型
4. 事件数据必须 JSON 可序列化
5. 广播必须有速率限制，防止滥用
6. 错误必须记录日志，便于调试
7. 支持批量广播，减少 API 调用

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
