# config/
> L2 | 父级: /src/CLAUDE.md

## 成员清单

appIds.ts: 应用 ID 枚举，定义所有应用的唯一标识符，类型安全的 AppId 类型
appRegistry.tsx: 应用注册表，映射 AppId 到应用组件、配置、元数据，懒加载应用
appRegistryData.ts: 应用配置数据，窗口默认尺寸、位置、图标、标题、帮助项

## 依赖关系
- 依赖 @/apps 应用模块
- 依赖 React.lazy 懒加载
- 被 AppManager 消费
- 被 useWindowManager 消费
- 被 Desktop/Dock/MenuBar 消费

## 配置约束
1. 新应用必须在 appIds.ts 中添加 ID
2. 新应用必须在 appRegistry.tsx 中注册
3. 应用配置必须包含 defaultSize、defaultPosition
4. 应用图标路径必须正确，指向 public/icons/
5. 应用必须使用 React.lazy 懒加载，优化性能
6. 应用 ID 必须唯一，不能重复
7. 应用配置变更必须同步更新类型定义

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
