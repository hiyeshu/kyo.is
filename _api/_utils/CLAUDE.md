# _api/_utils/
> L2 | 父级: /_api/CLAUDE.md

## 成员清单

_aiModels.ts: AI 模型配置，支持的模型列表、模型实例化、能力映射
_aiPrompts.ts: AI 提示词模板，系统提示、角色设定、工具使用指南、内存指令
_cors.ts: CORS 工具，允许的源检查、CORS 头设置、预检请求处理
_hash.ts: 哈希工具，密码哈希、bcrypt 封装、安全随机数生成
_logging.ts: 日志工具，结构化日志、日志级别、Edge/Node.js 适配
_memory.ts: 内存系统，用户记忆索引、记忆详情、Redis 存储
_rate-limit.ts: 速率限制，IP 限流、用户限流、滑动窗口算法、Redis 计数
_song-service.ts: 歌曲服务，YouTube 元数据获取、歌词搜索、缓存管理
_sse.ts: SSE 工具，Server-Sent Events 流生成、心跳、错误处理
_url.ts: URL 工具，URL 解析、验证、规范化、安全检查
_validation.ts: 验证工具，输入验证、类型检查、Zod schema
constants.ts: 常量定义，Redis 键前缀、速率限制配置、超时时间
middleware.ts: 中间件，请求预处理、认证检查、日志记录
redis.ts: Redis 客户端，Upstash Redis 连接、单例模式

### 子目录模块
auth/ - 认证工具，令牌生成、验证、密码哈希、会话管理

## 依赖关系
- 依赖 Upstash Redis
- 依赖 bcryptjs 密码哈希
- 依赖 Zod 验证库
- 被所有 API 端点消费

## 工具约束
1. 所有工具函数必须有错误处理
2. Redis 操作必须有超时和重试
3. 日志必须结构化，包含上下文信息
4. 速率限制必须精确，避免误杀
5. 验证必须严格，拒绝无效输入
6. 工具函数必须是纯函数（除非需要副作用）
7. 性能敏感函数必须优化，避免阻塞

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
