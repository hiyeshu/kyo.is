# extension/
> L2 | 父级: /CLAUDE.md

Kyo Chrome Extension — Manifest V3
新标签页 iframe 嵌入 kyo.is + 点击图标只收藏（不取消）+ postMessage 认证桥接

## 成员清单

manifest.json: Manifest V3 配置，无 popup，点击图标触发 onClicked 只收藏
newtab.html: 新标签页，全屏 iframe 嵌入 kyo.is，加载 newtab-bridge.js（MV3 禁止 inline script）
newtab-bridge.js: 双向桥接脚本，auth 中继（kyo.is→background）+ 书签中继（background→kyo.is iframe）
background.js: Service Worker 入口，图标只收藏（不取消）、右键菜单、快捷键、图标状态、定时同步、auth session 接收
lib/storage.js: chrome.storage.local 书签 CRUD，_synced 标记追踪同步状态
lib/auth.js: session 读取 + token 自动刷新（session 由 newtab iframe 桥接写入，不再自己做 OAuth）
lib/sync.js: Supabase REST API 直连云同步，push/delete/pull/initialSync
icons/: 插件图标 16/48/128 PNG

## 数据流

```
认证：kyo.is (iframe) → postMessage → newtab.html 中继 → background.js 存 session
     握手协议：newtab 先发 kyo:handshake → kyo.is 验证 chrome-extension:// 来源 → 回传 kyo:auth

收藏：用户点击图标/Alt+K/右键菜单 → handleSaveAction → 已收藏则静默忽略 → 未收藏则存本地 + enrich + push 云端
     取消收藏只在 kyo.is 桌面操作，插件不提供取消入口

书签桥接（无需登录）：background 收藏成功 → chrome.tabs.sendMessage → newtab-bridge 中继 → postMessage kyo:bookmark-add → kyo.is useBookmarkStore.addBookmark
     enrich 完成后再推一次更新版本

首次安装：本地收藏（_synced: false）→ 用户在 newtab 登录 → initialSync 上传所有未同步书签
```

## 依赖关系
- 依赖 kyo.is/api/scrape 获取链接元数据（无需认证）
- 依赖 Supabase REST API 直接读写 kyo_items 表（需 JWT）
- 依赖 kyo.is 主站 useAuthStore 的 postMessage 桥接
- 新标签页依赖 kyo.is 可被 iframe 嵌入

## 设计约束
1. 纯 Vanilla JS，不引入框架（减小体积，Service Worker 兼容）
2. 无 popup，无独立登录页——kyo.is 是唯一认证入口
3. 本地优先：收藏操作先存 chrome.storage.local，再异步同步
4. Service Worker 无状态：所有持久数据走 chrome.storage.local
5. 定时同步用 chrome.alarms（5 分钟），不用 WebSocket
6. postMessage 安全：握手协议验证 chrome-extension:// 来源

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
