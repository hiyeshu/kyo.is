# styles/
> L2 | 父级: /src/CLAUDE.md

## 成员清单

design-system.css: 设计系统核心，三层缩放架构（device/theme/user），基准尺寸、图标、字体、间距的 CSS 变量
themes.css: 主题样式定义，CSS 变量、主题切换、System 7/Aqua/XP/Win98 样式、暗色模式

## 依赖关系
- 被 App.tsx 全局导入
- 依赖 Tailwind CSS 基础样式
- 被所有组件通过 CSS 变量消费

## 样式约束
1. 所有颜色、间距、字体必须使用 CSS 变量
2. 主题切换通过 data-theme 属性
3. 暗色模式通过 .dark 类名
4. 禁止硬编码颜色值，使用 var(--color-name)
5. 响应式样式使用 Tailwind 断点
6. 动画使用 Tailwind 动画类或 Framer Motion
7. 避免全局样式污染，使用作用域样式

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
