# apps/base/
> L2 | 父级: /src/apps/CLAUDE.md

## 成员清单

AppManager.tsx: 应用管理器，核心应用容器，管理所有应用实例、窗口生命周期、层级控制
types.ts: 应用类型定义，AppState、AppInstance、AppConfig、窗口状态、应用元数据

## 依赖关系
- 依赖 @/config/appRegistry 应用注册表
- 依赖 @/stores/useAppStore 应用状态
- 依赖 @/components/layout/WindowFrame 窗口框架
- 被 App.tsx 使用
- 被所有应用继承类型

## 应用框架约束
1. AppManager 是单例，全局唯一
2. 所有应用必须通过 appRegistry 注册
3. 应用实例必须有唯一 instanceId
4. 窗口状态必须持久化到 localStorage
5. 应用生命周期：创建 → 打开 → 最小化 → 恢复 → 关闭
6. 应用必须支持多实例（除非明确单例）
7. 应用卸载时必须清理资源（事件监听、定时器、订阅）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
