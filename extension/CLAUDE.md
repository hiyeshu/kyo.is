# extension/
> L2 | 父级: /CLAUDE.md

Kyo Chrome Extension — Manifest V3
新标签页 iframe 嵌入 kyo.is + 自动打开全局搜索 + 浏览器原生数据混合搜索 + 点击图标只收藏（不取消）+ postMessage 认证桥接

## 成员清单

manifest.json: Manifest V3 配置，权限含 bookmarks/history，CSP 声明，chrome.i18n 国际化（__MSG_*__），无 popup
newtab.html: 新标签页，全屏 iframe 嵌入 kyo.is，含错误遮罩层，加载 newtab-bridge.js
newtab-bridge.js: 双向桥接脚本，auth 中继 + 书签中继 + 自动打开搜索（kyo:open-search）+ 浏览器原生数据推送（kyo:browser-data）+ iframe 加载失败检测与重试
background.js: Service Worker 入口，图标只收藏（不取消）、右键菜单、快捷键、图标状态、定时同步、badge 用 chrome.alarms 替代 setTimeout、getBrowserData 采集浏览器书签/历史
lib/config.js: 配置单一真相源（SUPABASE_URL, SUPABASE_ANON_KEY, API_BASE, STORAGE_KEYS）
lib/storage.js: chrome.storage.local 书签 CRUD + update() 局部更新，_synced 标记追踪同步状态
lib/auth.js: session 读取 + token 自动刷新（session 由 newtab iframe 桥接写入）
lib/sync.js: Supabase REST API 云同步，并发控制（5 路），push/delete/pull/initialSync
_locales/: chrome.i18n 国际化，支持 zh_CN/en/zh_TW/ja/ko
icons/: 插件图标 16/48/128 PNG

## 数据流

```
认证：kyo.is (iframe) → postMessage → newtab.html 中继 → background.js 存 session
     握手协议：newtab 先发 kyo:handshake → kyo.is 验证 chrome-extension:// 来源 → 回传 kyo:auth

自动搜索：握手完成 → newtab-bridge 发 kyo:open-search → AppManager 监听 → 自动打开 CommandPalette

浏览器数据：握手完成 → newtab-bridge 请求 get-browser-data → background 调用 chrome.bookmarks/history API
           → 扁平化书签树 + 最近 200 条历史 → postMessage kyo:browser-data → useAuthStore 写入 useBrowserDataStore
           → CommandPalette 过滤时与 kyo 书签去重后显示

收藏：用户点击图标/Alt+K/右键菜单 → handleSaveAction → 已收藏则静默忽略 → 未收藏则存本地 + enrich + push 云端
     取消收藏只在 kyo.is 桌面操作，插件不提供取消入口

书签桥接（无需登录）：background 收藏成功 → chrome.runtime.sendMessage → newtab-bridge 中继 → postMessage kyo:bookmark-add → kyo.is useBookmarkStore.addBookmark

首次安装：本地收藏（_synced: false）→ 用户在 newtab 登录 → initialSync 上传所有未同步书签（5 路并发）
```

## 依赖关系
- 依赖 kyo.is/api/scrape 获取链接元数据（无需认证）
- 依赖 Supabase REST API 直接读写 kyo_items 表（需 JWT）
- 依赖 kyo.is 主站 useAuthStore 的 postMessage 桥接
- 依赖 kyo.is 主站 useBrowserDataStore 接收浏览器原生数据
- 新标签页依赖 kyo.is 可被 iframe 嵌入

## 设计约束
1. 纯 Vanilla JS，不引入框架（减小体积，Service Worker 兼容）
2. 无 popup，无独立登录页——kyo.is 是唯一认证入口
3. 本地优先：收藏操作先存 chrome.storage.local，再异步同步
4. Service Worker 无状态：所有持久数据走 chrome.storage.local，禁止 setTimeout（用 chrome.alarms）
5. 定时同步用 chrome.alarms（5 分钟），不用 WebSocket
6. postMessage 安全：握手协议验证 chrome-extension:// 来源
7. 配置单一真相源：所有常量从 lib/config.js 导入，禁止重复硬编码
8. 存储抽象：所有 chrome.storage.local 操作通过 lib/storage.js，禁止外部直写
9. 国际化：所有用户可见文本通过 chrome.i18n.getMessage()，支持 5 种语言
10. 浏览器原生数据是瞬态的：每次新标签页加载重新拉取，不持久化到 IndexedDB
11. 去重策略：kyo 书签优先，浏览器书签/历史仅显示 kyo 中没有的 URL

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
