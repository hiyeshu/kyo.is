# apps/bookmark-board/hooks/
> L2 | 父级: /src/apps/bookmark-board/CLAUDE.md

## 成员清单

useBookmarkBoard.ts: 书签管理 hook，封装书签 CRUD 操作、搜索过滤、拖拽排序、导入导出逻辑

## 依赖关系
- 依赖 @/stores/useBookmarkStore 书签状态
- 依赖 @/hooks 共享 hooks
- 被 BookmarkBoardApp 组件使用

## Hook 约束
1. 书签数据持久化到 localStorage
2. 搜索支持防抖，避免频繁过滤
3. 拖拽排序实时更新状态
4. 导入支持浏览器书签格式（HTML）
5. 导出支持 JSON 和 HTML 格式
6. 书签 ID 使用 UUID 生成
7. Hook 必须返回清晰的 API 接口

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
