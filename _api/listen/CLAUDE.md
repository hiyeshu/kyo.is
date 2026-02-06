# _api/listen/
> L2 | 父级: /_api/CLAUDE.md

## 成员清单

### 子目录模块
_helpers/ - 监听辅助函数，常量定义、Pusher 通知、Redis 操作、类型定义
sessions/ - 监听会话管理，创建会话、更新状态、同步歌词、广播进度

## 功能说明
音乐监听功能，支持多用户同步听歌、实时歌词显示、进度同步、在线状态广播

## 依赖关系
- 依赖 Pusher 实时通信
- 依赖 Redis 存储会话状态
- 依赖 _api/songs 歌曲元数据
- 被前端 iPod 应用调用

## 监听约束
1. 会话 ID 使用 UUID 生成，保证唯一性
2. 会话状态存储到 Redis，设置过期时间（1 小时）
3. 歌词进度必须实时同步，延迟 < 500ms
4. 在线状态通过 Pusher presence channel 管理
5. 会话结束时清理 Redis 数据
6. 支持暂停、播放、跳转进度
7. 支持多用户同时监听同一首歌

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
