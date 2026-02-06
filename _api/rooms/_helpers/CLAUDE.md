# _api/rooms/_helpers/
> L2 | 父级: /_api/rooms/CLAUDE.md

## 成员清单

_constants.ts: 聊天室常量，Redis 键前缀、消息限制、在线状态超时
_helpers.ts: 通用辅助函数，数据格式化、错误处理、日志记录
_messages.ts: 消息辅助函数，消息存储、获取、删除、分页
_presence.ts: 在线状态辅助函数，用户上线、下线、状态更新
_pusher.ts: Pusher 辅助函数，频道认证、事件广播、在线状态同步
_redis.ts: Redis 辅助函数，聊天室数据存储、查询、清理
_rooms.ts: 聊天室辅助函数，创建、删除、更新、成员管理
_tokens.ts: 聊天室令牌辅助函数，邀请令牌生成、验证
_types.ts: 聊天室类型定义，Room、Message、Member、Presence
_users.ts: 用户辅助函数，用户信息获取、权限检查

## 依赖关系
- 依赖 Redis 存储聊天室数据
- 依赖 Pusher 实时通信
- 被 _api/rooms 端点使用

## 辅助函数约束
1. 所有函数必须有错误处理
2. Redis 操作必须有超时控制
3. 函数必须是纯函数（除非需要副作用）
4. 函数必须有清晰的参数和返回值类型
5. 复杂逻辑必须拆分为小函数
6. 函数必须有单元测试
7. 函数必须有 JSDoc 注释

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
