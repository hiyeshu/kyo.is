# components/landing/
> L2 | 父级: /src/components/CLAUDE.md

## 成员清单

LandingPage.tsx: 产品开屏页，首次访问展示，包含 Hero（Logo+标题+CTA）、两个操作动画演示（粘贴链接+搜索）、6 个 Feature 卡片、Footer

## 依赖关系
- 依赖 @/components/ui/button Button 组件（CTA 按钮）
- 依赖 @/components/ui/card Card/CardContent 组件（Feature 卡片 + 演示区容器）
- 依赖 @/components/ui/input Input 组件（搜索演示区）
- 依赖 framer-motion 动画库
- 依赖 react-i18next 国际化
- 被 App.tsx 根据 hasEnteredDesktop 状态条件渲染

## 设计约束
1. 独立设计风格，不跟随 OS 主题（Aqua/XP/Win98）
2. 品牌色 #3F9CFF（Kyo 图标蓝）
3. 动画演示使用硬编码 mock 数据，不依赖 store
4. 响应式：移动端单列，桌面端双列
5. 所有文本通过 t() 国际化

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
