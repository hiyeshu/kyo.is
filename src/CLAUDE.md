# src/
> L2 | 父级: /CLAUDE.md

## 成员清单

### 根目录文件
App.tsx: 应用根组件，管理启动流程、主题切换、离线检测、Toast 配置、屏保覆盖层，依赖 AppManager
main.tsx: 应用入口，React 18 渲染，i18n 初始化，主题提供者，Analytics 集成
vite-env.d.ts: Vite 环境类型定义，声明模块类型

### 子目录模块
apps/ - 应用模块，每个应用独立目录，包含组件、逻辑、配置
components/ - 共享 React 组件，UI 库、布局、对话框、屏保
config/ - 配置文件，应用注册表、主题配置、壁纸清单、音效映射
hooks/ - 自定义 React Hooks，窗口管理、文件系统、音频、AI 助手
lib/ - 工具库，i18n 翻译、Three.js 着色器、音频处理、工具函数
stores/ - Zustand 状态管理，应用状态、窗口状态、文件系统、用户设置
styles/ - 全局样式，主题 CSS 变量、动画、字体、重置样式
types/ - TypeScript 类型定义，应用类型、窗口类型、文件系统类型、API 类型
utils/ - 通用工具函数，平台检测、显示模式、启动消息、预加载

## 依赖关系
- 依赖 React 19 + TypeScript
- 依赖 Tailwind CSS + Framer Motion 样式与动画
- 依赖 Zustand 全局状态管理
- 依赖 i18next 国际化
- 依赖 Vercel AI SDK 与后端 _api/ 通信
- 被 index.html 加载，作为 SPA 入口

## 架构约束
1. 所有应用必须通过 appRegistry 注册
2. 窗口管理统一使用 useWindowManager hook
3. 文件系统操作统一使用 useFileSystem hook
4. 全局状态使用 Zustand，局部状态使用 useState
5. 主题切换通过 useThemeStore，禁止硬编码样式
6. 国际化文本必须通过 useTranslation，禁止硬编码字符串
7. 组件必须支持移动端，使用 useIsMobile 适配
8. 性能优化：懒加载、虚拟滚动、代码分割

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
