# history/
> L2 | 父级: /src/apps/CLAUDE.md

## 成员清单

index.ts: 应用入口，导出 HistoryApp
metadata.ts: 应用元数据（名称、图标、帮助项），被 appRegistry 消费
components/HistoryApp.tsx: 时间线历史记录窗口，读取 useHistoryStore，按时间分组展示，支持搜索/分页/复制

## 依赖关系

- 依赖 stores/useHistoryStore 的本地历史数据
- 依赖 stores/useBookmarkStore 的 openBookmarkUrl + 播种数据
- 依赖 stores/useStickiesStore 的播种数据
- 被 config/appRegistry.tsx 注册并懒加载

## 设计约束

1. 历史记录纯本地存储（localStorage），不同步云端
2. 删除的条目保留在历史中（markDeleted），透明度降低
3. 所有条目操作统一：点击打开/查看，按钮复制，无右键菜单
4. 默认展示 50 条，滚动到底加载更多
5. 按时间分组：今天 / 昨天 / 本周 / 更早

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
