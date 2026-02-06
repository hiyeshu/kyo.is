# _api/auth/
> L2 | 父级: /_api/CLAUDE.md

## 成员清单

login.ts: 登录端点，验证用户名密码、生成令牌、返回用户信息
logout.ts: 登出端点，删除当前令牌、清除会话
logout-all.ts: 全部登出端点，删除用户所有令牌、强制下线
register.ts: 注册端点，创建新用户、密码哈希、初始化用户数据
tokens.ts: 令牌列表端点，查看用户所有活跃令牌、设备信息

### 子目录模块
password/ - 密码管理，修改密码、重置密码、密码强度验证
token/ - 令牌管理，令牌验证、刷新、撤销

## 依赖关系
- 依赖 _utils/auth 认证工具
- 依赖 _utils/_hash 密码哈希
- 依赖 Redis 存储令牌和会话
- 被前端 useAuth hook 调用

## 认证约束
1. 密码必须使用 bcrypt 哈希，salt rounds >= 10
2. 令牌使用 crypto.randomBytes 生成，长度 >= 32
3. 令牌存储到 Redis，设置过期时间（默认 30 天）
4. 登录失败必须有速率限制，防止暴力破解
5. 敏感操作必须验证令牌有效性
6. 密码不能明文传输，必须 HTTPS
7. 用户名必须唯一，注册时检查重复

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
