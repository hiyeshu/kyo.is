# apps/stickies/components/
> L2 | 父级: /src/apps/stickies/CLAUDE.md

## 成员清单

StickiesApp.tsx: 便签应用主组件（轻量管理器），菜单栏操作、对话框、选中同步，便签渲染委托给 StickyNotesLayer
StickyNote.tsx: 单张便签组件，拖拽/缩放/编辑，被 StickyNotesLayer 使用
StickiesMenuBar.tsx: 菜单栏组件，提供创建/颜色/清理入口

## 架构说明
便签采用"一等公民"架构：
- 便签由 StickyNotesLayer（src/components/layout/）统一渲染，不依赖 stickies 应用是否打开
- StickiesApp 仅作为"便签管理器"：提供菜单栏操作（新建、删除、换色、清空）
- 便签选中状态通过 window 事件 `stickies:noteSelected` 从 StickyNotesLayer 同步到 StickiesApp

## 依赖关系
- 依赖 @/stores/useStickiesStore 便签状态（单一真相源）
- 依赖 @/components/layout/MenuBar 菜单栏
- 依赖 @/components/dialogs 帮助/关于对话框
- 被 apps/stickies/index.ts 导出
- StickyNote 被 @/components/layout/StickyNotesLayer 消费

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
