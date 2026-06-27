# stores/
> L2 | 父级: /src/CLAUDE.md

## 成员清单

helpers.ts: Zustand 浅比较辅助函数，优化 store 订阅性能，避免不必要的重渲染
useAppStore.ts: 应用管理核心状态，窗口实例、最近应用、AI 模型选择，存储键 kyo:app-store
useAudioSettingsStore.ts: 音频设置状态，系统音效开关、音量控制，持久化
useAuthStore.ts: 认证状态管理，Google OAuth 登录/登出，Supabase Auth 监听，登录时触发 initialSync
useBookmarkStore.ts: 书签管理状态，书签列表、分类、orderIndex 手动排序、桌面显示标记(onDesktop)、Dock 固定标记(inDock)，持久化，每次增删改排序同步写云端，favicon 只存 URL（Icon Horse 或 FAVICON_OVERRIDES），v11 迁移补齐 orderIndex
useDisplaySettingsStore.ts: 显示设置状态，显示模式、壁纸、屏保，存储键 kyo:display-settings
useDockStore.ts: Dock 栏状态，仅固定应用列表（书签 inDock 已迁移至 useBookmarkStore）、拖拽排序、显示/隐藏，持久化
useThemeStore.ts: 主题状态，当前主题，存储键 kyo:theme 和 kyo:theme-sync-wallpaper
useCustomThemeStore.ts: 自定义主题状态，基于 themeSchema 管理用户自定义主题，编辑器临时状态
useStickiesStore.ts: 便利贴状态，便签列表、颜色、位置、尺寸与 orderIndex，持久化，每次增删改排序同步写云端
useSyncStore.ts: 云端数据加载，登录时 initialSync 双向合并，本地/云端按 updatedAt 裁决，并维护 orderIndex 排序同构
useKyoItemStore.ts: KyoItem 统一查询层，不持有数据，从 bookmark + stickies 派生 KyoItem 格式
useLinkMetaStore.ts: 链接元数据缓存，URL 预览信息（标题、描述、图片）
useBrowserDataStore.ts: 浏览器原生数据瞬态存储，接收插件通过 postMessage 注入的 Chrome 书签和历史记录，不持久化，被 CommandPalette 消费

## 已删除文件（Phase 1 清理）
- useFilesStore.ts (文件系统，Kyo 无文件系统)
- useFinderStore.ts (Finder 应用，Kyo 无 Finder)

## 依赖关系
- 依赖 Zustand 状态管理库
- 依赖 zustand/middleware 的 persist 中间件
- 依赖 @/config/appRegistry 应用配置
- 依赖 @/types 类型定义
- 被所有组件通过 hooks 消费

## 状态管理约束
1. 所有 store 必须使用 create() 创建
2. 需要持久化的 store 必须使用 persist 中间件
3. 复杂状态更新必须使用 immer 或不可变更新
4. 订阅 store 时优先使用 helpers.ts 的浅比较函数
5. 避免在 store 中存储派生状态，使用 useMemo 计算
6. 异步操作放在 actions 中，不要在 reducer 中执行
7. Store 之间避免循环依赖，保持单向数据流
8. localStorage 键统一使用 `kyo:` 前缀

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
