# apps/bookmarks/
> L2 | 父级: /src/apps/CLAUDE.md

## 成员清单

### 根目录文件
index.ts: 应用入口，导出 BookmarkBoardApp 主组件
metadata.ts: 应用元数据，版本、名称、图标、帮助项

### 子目录模块
components/ - 应用组件
  BookmarkBoardApp.tsx: 书签应用主界面，卡片网格布局、搜索、拖拽排序
  BookmarkBoardMenuBar.tsx: 应用菜单栏，文件/编辑/视图/帮助菜单
  IconPicker.tsx: 图标选择器，三种模式（Auto/Upload/Emoji），使用设计系统 Tabs
  BookmarkIconDisplay.tsx: 图标渲染组件，使用 getBookmarkIconInfo 单一真相源
hooks/ - 应用 hooks
  useBookmarkBoard.ts: 书签业务逻辑，CRUD、搜索、拖拽、图标编辑

## 应用功能
- 空间书签管理，类似 Pinterest 的卡片布局
- 支持文件夹分类、拖拽排序
- 支持搜索、过滤
- 三种图标模式：Auto（自动获取）、Upload（自定义上传）、Emoji（符号选择）
- 自定义图标直接存 base64 在 bookmark 对象里（便于账号同步）
- 移动端支持触摸拖拽和长按菜单

## 依赖关系
- 依赖 @/stores/useBookmarkStore 书签状态（getBookmarkIconInfo 单一真相源）
- 依赖 @/components/ui UI 组件（Tabs、Button、Input、Dialog）
- 被 appRegistry 注册
- 被 AppManager 加载
- 被 Dock 消费（书签图标同步）

## 数据模型
```typescript
type IconType = "favicon" | "custom" | "emoji";

interface BookmarkIcon {
  type: IconType;
  value: string; // favicon: URL | custom: base64 | emoji: 字符
}

interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string; // 兼容旧数据
  icon?: BookmarkIcon; // 新的图标配置
}

// 单一真相源
function getBookmarkIconInfo(bookmark: Bookmark): BookmarkIconInfo;
```

## 应用约束
1. 书签数据持久化到 localStorage（useBookmarkStore）
2. 自定义图标直接存 base64（限 100KB，便于账号同步）
3. 拖拽使用 HTML5 Drag API
4. 搜索支持模糊匹配
5. 所有图标渲染必须通过 getBookmarkIconInfo 单一真相源
6. Emoji 选择器提供 8x10 = 80 个精选 emoji

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
