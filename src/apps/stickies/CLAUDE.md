# apps/stickies/
> L2 | 父级: /src/apps/CLAUDE.md

## 成员清单

### 根目录文件
index.ts: 应用入口，导出 StickiesApp 主组件
metadata.ts: 应用元数据，版本、名称、图标、帮助项

### 子目录模块
components/ - 便签应用组件
  StickiesApp.tsx: 便利贴主组件，渲染便签列表与菜单栏
  StickyNote.tsx: 单张便签组件，拖拽/缩放/编辑
  StickiesMenuBar.tsx: 菜单栏组件，便签创建/颜色切换/清理
hooks/ - 应用 hooks
  useStickiesLogic.ts: 便签业务逻辑，状态聚合与对话框控制

## 依赖关系
- 依赖 @/stores/useStickiesStore 便签状态
- 依赖 @/components/dialogs 帮助与关于对话框
- 依赖 @/components/layout/MenuBar 菜单栏
- 依赖 framer-motion 动画
- 被 appRegistry 注册

## 应用约束
1. 便签数据持久化到 localStorage（kyo:stickies-store）
2. 便签必须支持拖拽与缩放
3. 所有文本必须国际化
4. 便签颜色使用 CSS 变量

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
