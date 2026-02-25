# components/landing/
> L2 | 父级: /src/components/CLAUDE.md

## 成员清单

LandingPage.tsx: 产品开屏页，Dock 悬停放大（macOS 风格）+ 便利贴可拖动旋转 + DemoShowcase 场景轮播（粘贴6s→搜索6s），Hero + Feature 便利贴 + Footer

## 内部组件结构
- DockIcon: Dock 图标组件，距离感应放大（useMotionValue/useTransform/useSpring），移动端不放大
- MiniDesktop: 迷你桌面容器（MenuBar + 壁纸 + 桌面图标 + Dock），icons 接受 ReactNode
- DemoShowcase: 场景轮播控制器，管理 paste/search 切换 + 文案 AnimatePresence
- PasteOverlay: 场景A 浮层（⌘V 指示器 → toast → 书签已添加）
- SearchOverlay: 场景B 浮层（CommandPalette 自动打字 → 结果列表 → 选中高亮）
- PasteIcons / StaticIcons: 桌面图标渲染器，粘贴场景动态新增图标
- DesktopIcon: 单个桌面图标组件
- LanguageSwitcher: 语言切换下拉菜单

## 依赖关系
- 依赖 framer-motion AnimatePresence/motion/useMotionValue/useTransform/useSpring 动画
- 依赖 react-i18next 国际化
- 依赖 @/lib/i18n 语言配置
- 依赖 @/hooks/useIsMobile 移动端检测
- 被 App.tsx 根据 hasEnteredDesktop 状态条件渲染

## 设计约束
1. Aqua 风格迷你桌面，使用 Lucida Grande 字体 + pinstripe 纹理
2. 110% 缩放（transform: scale(1.1)），全宽展示
3. 壁纸固定 /wallpapers/photos/aqua/aqua_kyo.jpg
4. 动画演示使用硬编码 mock 数据，不依赖 store
5. 所有文本通过 t() 国际化，必须带 fallback 默认值
6. 场景轮播 12s 循环（粘贴 6s → 搜索 6s）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
