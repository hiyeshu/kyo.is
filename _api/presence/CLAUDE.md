# _api/presence/
> L2 | 父级: /_api/CLAUDE.md

## 成员清单

switch.ts: 在线状态切换端点，设置用户在线/离线/忙碌状态，广播状态变更

## 依赖关系
- 依赖 Pusher presence channel
- 依赖 Redis 存储用户状态
- 依赖 _utils/auth 认证验证
- 被前端聊天应用调用

## 在线状态约束
1. 状态类型：online（在线）、offline（离线）、busy（忙碌）、away（离开）
2. 状态变更必须实时广播到所有订阅用户
3. 离线状态自动设置，超过 5 分钟无活动
4. 状态存储到 Redis，设置过期时间（10 分钟）
5. 支持自定义状态消息（如"正在开会"）
6. 状态变更必须有时间戳
7. 支持隐身模式，对特定用户不可见

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
