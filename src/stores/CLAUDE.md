# stores/
> L2 | 父级: /src/CLAUDE.md

## 成员清单

helpers.ts: Zustand 浅比较辅助函数，优化 store 订阅性能，避免不必要的重渲染
useAppStore.ts: 应用管理核心状态，窗口实例、最近应用、最近文档、启动动画、AI 模型选择、首次启动标记，持久化到 localStorage
useAudioSettingsStore.ts: 音频设置状态，系统音效开关、音量控制，持久化
useBookmarkStore.ts: 书签管理状态，书签列表、分类、拖拽排序、导入导出，持久化
useDisplaySettingsStore.ts: 显示设置状态，显示模式（桌面/平板/手机）、壁纸、屏保、动画开关，持久化
useDockStore.ts: Dock 栏状态，固定应用列表、拖拽排序、显示/隐藏，持久化
useFilesStore.ts: 文件系统状态，虚拟文件树、当前目录、选中文件，持久化到 IndexedDB
useFinderStore.ts: Finder 应用状态，视图模式、排序方式、侧边栏展开，持久化
useThemeStore.ts: 主题状态，当前主题（system7/aqua/xp/win98）、暗色模式、主题切换，持久化
useCustomThemeStore.ts: 自定义主题状态，基于 themeSchema 管理用户自定义主题，编辑器临时状态，主题导入导出，持久化

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

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
