# apps/bookmark-board/components/
> L2 | 父级: /src/apps/bookmark-board/CLAUDE.md

## 成员清单

BookmarkBoardApp.tsx: 书签应用主组件，书签网格布局、拖拽排序、搜索过滤、文件夹管理
BookmarkBoardMenuBar.tsx: 书签应用菜单栏，文件菜单（添加、导入、导出）、编辑菜单（删除、重命名）、视图菜单（网格/列表）

## 依赖关系
- 依赖 @/stores/useBookmarkStore 书签状态
- 依赖 @/components/ui UI 组件
- 依赖 @/hooks 自定义 hooks
- 被 apps/bookmark-board/index.ts 导出

## 组件约束
1. 书签卡片支持拖拽排序，使用 HTML5 Drag API
2. 搜索支持模糊匹配、标签过滤
3. 文件夹支持嵌套、展开/折叠
4. 书签卡片显示标题、图标、URL、描述
5. 支持批量操作（删除、移动）
6. 支持右键菜单（编辑、删除、打开）
7. 移动端支持触摸拖拽和长按菜单

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
