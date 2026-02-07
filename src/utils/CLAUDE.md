# utils/
> L2 | 父级: /src/CLAUDE.md

## 成员清单

analytics.ts: 分析事件定义，Vercel Analytics 集成，仅保留 APP_ANALYTICS.APP_LAUNCH
audio.ts: 音频工具函数，音频格式转换、波形生成、音频分析
bootMessage.ts: 启动消息管理，首次启动提示、调试模式，存储键 kyo:nextBootMessage
device.ts: 设备检测，浏览器类型、操作系统、触摸支持
displayMode.ts: 显示模式管理，桌面/平板/手机模式切换、CSS 类应用
i18n.ts: 国际化工具，语言代码转换、翻译键生成
icons.ts: 图标工具，图标路径解析、默认图标、图标缓存
indexedDB.ts: IndexedDB 封装，数据库名 "Kyo"，版本管理
indexedDBOperations.ts: IndexedDB 操作，CRUD、查询、事务管理
offline.ts: 离线检测工具，网络状态监听、离线提示
performanceCheck.ts: 性能检测，FPS 监控、内存使用、性能警告
platform.ts: 平台检测，Tauri 桌面应用、Web 浏览器、环境变量
prefetch.ts: 预加载工具，资源预加载、版本检查，存储键 kyo:manifest-timestamp
sharedUrl.ts: 分享 URL 生成，短链接、二维码、社交分享
tabStyles.ts: 标签页样式，主题相关的标签样式生成
wallpapers.ts: 壁纸工具，壁纸列表、预加载、视频壁纸
windowUtils.ts: 窗口工具，窗口居中、边界检测、层级管理

### 子目录模块
markdown/ - Markdown 工具，解析、渲染、语法高亮

## 已删除文件（Phase 1 清理）
- abortableFetch.ts, chat.ts, chunkedStream.ts, sse.ts (聊天相关)
- appletAuthBridge.ts, appletMetadata.ts (Applet 相关)
- imagePreprocessing.ts, languageDetection.ts (未使用)
- lyricsSearch.ts, songMetadataCache.ts, romanization.tsx, renderLyricsWithAnnotations.tsx (歌词相关)

## 依赖关系
- 依赖浏览器 API (IndexedDB, Fetch)
- 依赖 @/types 类型定义
- 被所有组件、hooks、应用消费

## 工具函数约束
1. 所有函数必须是纯函数，无副作用（除非明确需要）
2. 异步函数必须返回 Promise，支持 async/await
3. 错误处理必须完善，避免未捕获异常
4. 工具函数必须有 TypeScript 类型定义
5. 避免循环依赖，保持模块独立性
6. localStorage 键统一使用 `kyo:` 前缀

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
