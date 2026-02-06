# _api/_utils/auth/
> L2 | 父级: /_api/_utils/CLAUDE.md

## 成员清单

index.ts: 认证工具导出入口，统一导出所有认证函数
_constants.ts: 认证常量，Redis 键前缀、令牌过期时间、密码规则
_extract.ts: 令牌提取工具，从请求头、Cookie、查询参数提取令牌
_password-storage.ts: 密码存储工具，密码哈希存储、验证、更新
_password.ts: 密码工具，密码强度验证、哈希生成、比对
_tokens.ts: 令牌工具，令牌生成、验证、刷新、撤销
_types.ts: 认证类型定义，User、Token、Session、AuthContext
_validate.ts: 认证验证工具，验证用户身份、权限检查、令牌有效性

## 依赖关系
- 依赖 bcryptjs 密码哈希
- 依赖 crypto 令牌生成
- 依赖 Redis 存储令牌和会话
- 被所有需要认证的 API 端点使用

## 认证工具约束
1. 密码哈希使用 bcrypt，salt rounds = 10
2. 令牌使用 crypto.randomBytes(32)，Base64 编码
3. 令牌存储到 Redis，键格式：auth:token:{token}
4. 会话存储到 Redis，键格式：auth:session:{username}
5. 令牌过期时间默认 30 天，可配置
6. 密码强度：至少 8 字符，包含字母和数字
7. 验证失败必须返回统一错误格式

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
