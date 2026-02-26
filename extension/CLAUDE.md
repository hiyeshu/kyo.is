# extension/
> L2 | 父级: /CLAUDE.md

Kyo Chrome Extension — Manifest V3
新标签页 iframe 嵌入 kyo.is + 一键收藏 + Google OAuth 云同步

## 成员清单

manifest.json: Manifest V3 配置，声明权限、快捷键、新标签页覆盖、Service Worker
newtab.html: 新标签页，全屏 iframe 嵌入 https://kyo.is
background.js: Service Worker 入口，管理收藏、右键菜单、快捷键、图标状态、定时同步
popup.html: 点击插件图标的弹窗 UI（HTML + CSS）
popup.js: 弹窗交互逻辑，显示收藏状态 + 登录入口
lib/storage.js: chrome.storage.local 书签 CRUD，_synced 标记追踪同步状态
lib/auth.js: Google OAuth → Supabase signInWithIdToken，session 管理 + token 自动刷新
lib/sync.js: 双向云同步，initialSync 无感迁移（本地→云端 + 云端→本地）
icons/: 插件图标 16/48/128 PNG

## 数据流

```
用户点击收藏 → background.js saveBookmark()
  → storage.add() 存本地（即时反馈）
  → fetch /api/scrape 获取元数据（异步增强）
  → sync.pushBookmark() 推云端（如果已登录）

用户登录 → auth.signIn()
  → chrome.identity.getAuthToken() 获取 Google token
  → Supabase signInWithIdToken 换 session
  → sync.initialSync() 双向合并
    → pullAll() 拉云端 → mergeFromCloud() 合入本地
    → getUnsynced() 取本地未同步 → pushBookmark() 逐个上传
```

## 依赖关系
- 依赖 kyo.is/api/scrape 获取链接元数据（无需认证）
- 依赖 kyo.is/api/save 保存书签到云端（需 Supabase JWT）
- 依赖 kyo.is/api/sync 拉取云端书签（需 Supabase JWT）
- 依赖 Supabase Auth REST API 做 token 交换和刷新
- 新标签页依赖 kyo.is 可被 iframe 嵌入

## 设计约束
1. 纯 Vanilla JS，不引入框架（减小体积，Service Worker 兼容）
2. 数据结构对齐主站 Bookmark 接口（id, title, url, summary, tags, favicon, createdAt）
3. 本地优先：收藏操作先存 chrome.storage.local，再异步同步
4. Service Worker 无状态：所有持久数据走 chrome.storage.local
5. 定时同步用 chrome.alarms（5 分钟），不用 WebSocket

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
