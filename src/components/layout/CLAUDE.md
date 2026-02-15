# components/layout/
> L2 | 父级: /src/components/CLAUDE.md

## 成员清单

AppleMenu.tsx: Apple 菜单组件，macOS 风格左上角菜单，关于、系统偏好、最近使用项目、登入/登出
AppMenu.tsx: 应用菜单组件，当前应用的菜单栏，文件、编辑、视图、帮助
Desktop.tsx: 桌面组件，桌面环境核心，管理壁纸、图标、窗口、右键菜单（添加网站到 Dock）
Dock.tsx: Dock 栏组件，macOS 风格底部应用栏，应用图标、网站链接、最小化窗口、拖拽排序、右键添加网站
ExposeView.tsx: Exposé 视图组件，窗口总览，显示所有打开的窗口缩略图
exposeUtils.ts: Exposé 工具函数，窗口布局计算、动画参数
MenuBar.tsx: 菜单栏组件，macOS 风格顶部菜单栏，集成 AppleMenu 和 AppMenu
StartMenu.tsx: 开始菜单组件，Windows 风格开始菜单，应用列表、关机选项
WindowFrame.tsx: 窗口框架组件，窗口容器，标题栏、控制按钮、拖拽、缩放

## 依赖关系
- 依赖 @/hooks/useWindowManager 窗口管理
- 依赖 @/stores 全局状态
- 依赖 @/config/appRegistry 应用配置
- 依赖 Framer Motion 动画
- 被 App.tsx 组合使用

## 布局组件约束
1. 布局组件必须支持多主题（Aqua/XP/Win98）
2. 窗口管理必须使用 useWindowManager hook
3. 动画使用 Framer Motion，避免 CSS transition
4. 布局必须响应式，支持移动端适配
5. 拖拽使用原生 Drag API 或 Framer Motion
6. 层级管理使用 z-index，避免冲突
7. 性能优化：虚拟化、懒加载、防抖节流

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
