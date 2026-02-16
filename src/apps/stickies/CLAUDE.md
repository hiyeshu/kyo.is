# apps/stickies/
> L2 | 父级: /src/apps/CLAUDE.md

## 架构概览
便签采用"一等公民"架构：便签是桌面的一等公民，不依赖 stickies 应用是否打开。
- 便签由 StickyNotesLayer（src/components/layout/）统一渲染
- StickiesApp 仅作为"便签管理器"（菜单栏操作、对话框）
- 数据流：useStickiesStore → StickyNotesLayer → StickyNote

## 成员清单

### 根目录文件
index.ts: 应用入口，导出 StickiesApp 主组件
metadata.ts: 应用元数据，版本、名称、图标、帮助项

### 子目录模块
components/ - 便签应用组件
  StickiesApp.tsx: 便签管理器，菜单栏操作、对话框、选中同步，便签渲染委托给 StickyNotesLayer
  StickyNote.tsx: 单张便签组件，拖拽/缩放/编辑，被 StickyNotesLayer 使用
  StickiesMenuBar.tsx: 菜单栏组件，便签创建/颜色切换/清理
hooks/ - 应用 hooks
  useStickiesLogic.ts: 便签业务逻辑，状态聚合与对话框控制

## 依赖关系
- 依赖 @/stores/useStickiesStore 便签状态（单一真相源）
- 依赖 @/components/dialogs 帮助与关于对话框
- 依赖 @/components/layout/MenuBar 菜单栏
- StickyNote 被 @/components/layout/StickyNotesLayer 消费
- 被 appRegistry 注册

## 应用约束
1. 便签数据持久化到 localStorage（kyo:stickies-store）
2. 便签必须支持拖拽与缩放
3. 所有文本必须国际化
4. 便签颜色使用 CSS 变量
5. 便签选中通过 window 事件 `stickies:noteSelected` 同步

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
