# _api/listen/_helpers/
> L2 | 父级: /_api/listen/CLAUDE.md

## 成员清单

_constants.ts: 监听常量，Redis 键前缀、会话超时、同步间隔
_pusher.ts: Pusher 辅助函数，监听会话频道认证、进度广播、状态同步
_redis.ts: Redis 辅助函数，会话数据存储、查询、清理
_types.ts: 监听类型定义，ListenSession、SyncState、Progress

## 依赖关系
- 依赖 Redis 存储会话状态
- 依赖 Pusher 实时同步
- 被 _api/listen 端点使用

## 辅助函数约束
1. 会话状态必须实时同步，延迟 < 500ms
2. 会话过期时间 1 小时，自动清理
3. 进度同步精度到毫秒
4. 支持暂停、播放、跳转操作
5. 在线用户列表实时更新
6. 错误必须优雅处理，不中断会话
7. 函数必须有清晰的类型定义

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
