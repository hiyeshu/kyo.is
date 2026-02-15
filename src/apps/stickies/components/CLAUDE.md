# apps/stickies/components/
> L2 | 父级: /src/apps/stickies/CLAUDE.md

## 成员清单

StickiesApp.tsx: 便签应用主组件，渲染便签与菜单栏
StickyNote.tsx: 单张便签组件，拖拽/缩放/编辑
StickiesMenuBar.tsx: 菜单栏组件，提供创建/颜色/清理入口

## 依赖关系
- 依赖 @/stores/useStickiesStore 便签状态
- 依赖 @/components/layout/MenuBar 菜单栏
- 依赖 @/components/dialogs 帮助/关于对话框
- 依赖 framer-motion 动画
- 被 apps/stickies/index.ts 导出

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
