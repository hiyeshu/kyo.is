# components/
> L2 | 父级: /src/CLAUDE.md

## 成员清单

### 根目录组件
Webcam.tsx: 摄像头组件，访问用户摄像头、拍照、录像、实时滤镜，用于 Photo Booth 应用

### 子目录模块
ui/ - UI 基础组件库，基于 shadcn/ui，包含 Button、Input、Dialog、Dropdown、Checkbox 等 30+ 组件
layout/ - 布局组件，桌面环境核心，包含 Desktop、Dock、MenuBar、WindowFrame、AppleMenu、StartMenu、ExposeView
dialogs/ - 对话框组件，系统级弹窗，包含 BootScreen、ControlPanels、AboutDialog、FileDialog、ConfirmDialog
screensavers/ - 屏保组件，包含 ScreenSaverOverlay、多种屏保效果（飞行 Logo、矩阵雨、星空）
shared/ - 共享业务组件，跨应用复用，包含 FileIcon、AppIcon、ContextMenu、Toolbar

## 依赖关系
- 依赖 React 19 + TypeScript
- 依赖 Radix UI 无障碍组件库
- 依赖 Framer Motion 动画库
- 依赖 Tailwind CSS 样式
- 依赖 @/hooks 自定义 hooks
- 依赖 @/stores 全局状态
- 被所有应用和页面消费

## 组件设计约束
1. 所有组件必须支持移动端，使用 useIsMobile 适配
2. 交互组件必须支持键盘导航和无障碍
3. 动画使用 Framer Motion，避免直接操作 CSS transition
4. 样式使用 Tailwind CSS，禁止内联样式和 CSS Modules
5. 组件必须是纯函数，避免副作用（除非必要）
6. Props 必须有 TypeScript 类型定义
7. 复杂组件拆分为子组件，保持单一职责
8. 使用 forwardRef 暴露 DOM 引用

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
