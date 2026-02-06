# apps/bookmark-board/
> L2 | 父级: /src/apps/CLAUDE.md

## 成员清单

### 根目录文件
index.ts: 应用入口，导出 BookmarkBoardApp 主组件
metadata.ts: 应用元数据，版本、名称、图标、帮助项，已有 L3 头部契约

### 子目录模块
components/ - 应用组件，BookmarkBoardApp 主界面、BookmarkBoardMenuBar 菜单栏
hooks/ - 应用 hooks，书签管理、拖拽排序、搜索过滤

## 应用功能
- 空间书签管理，类似 Pinterest 的卡片布局
- 支持文件夹分类、拖拽排序
- 支持搜索、过滤、标签
- 支持导入导出书签
- 支持链接预览、图标获取
- 支持多种视图模式（网格、列表）

## 依赖关系
- 依赖 @/stores/useBookmarkStore 书签状态
- 依赖 @/components/ui UI 组件
- 依赖 @/hooks 共享 hooks
- 被 appRegistry 注册
- 被 AppManager 加载

## 应用约束
1. 书签数据持久化到 localStorage
2. 链接预览调用 /api/link-preview
3. 拖拽使用 HTML5 Drag API
4. 搜索支持模糊匹配、标签过滤
5. 导入支持浏览器书签格式（HTML）
6. 导出支持 JSON 和 HTML 格式
7. 移动端支持触摸拖拽和长按菜单

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
