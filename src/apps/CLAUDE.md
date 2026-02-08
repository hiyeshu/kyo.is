# apps/
> L2 | 父级: /src/CLAUDE.md

## 成员清单

### 子目录模块
base/ - 应用基础框架，AppManager 应用管理器、应用类型定义、窗口生命周期
bookmarks/ - 书签管理应用，空间书签板，支持文件夹、搜索、拖拽排序、导入导出
control-panels/ - 系统设置应用，主题、壁纸、音量、备份恢复
theme-editor/ - 主题编辑器，Expert Mode 可视化编辑所有 CSS 变量

## 应用架构
每个应用目录结构：
- index.ts: 应用入口，导出主组件
- metadata.ts: 应用元数据，版本、名称、图标、帮助项
- components/: 应用专属组件
- hooks/: 应用专属 hooks
- types.ts: 应用类型定义（可选）
- utils.ts: 应用工具函数（可选）

## 依赖关系
- 依赖 base/ 应用框架
- 依赖 @/components 共享组件
- 依赖 @/hooks 共享 hooks
- 依赖 @/stores 全局状态
- 被 @/config/appRegistry 注册
- 被 AppManager 加载和管理

## 应用开发约束
1. 所有应用必须在 appRegistry 中注册
2. 应用组件必须接收 instanceId 和 appId props
3. 应用必须使用 useWindowManager 管理窗口状态
4. 应用必须导出 metadata.ts 包含元数据
5. 应用图标必须放在 public/icons/ 目录
6. 应用必须支持多实例（除非明确单例）
7. 应用必须支持移动端适配
8. 应用状态优先使用局部 state，全局状态放 stores

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
