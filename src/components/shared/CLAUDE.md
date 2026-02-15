# components/shared/
> L2 | 父级: /src/components/CLAUDE.md

## 成员清单

PrefetchToast.tsx: 预加载提示组件，显示资源预加载进度、桌面应用更新提示
ThemedIcon.tsx: 主题图标组件，根据当前主题显示不同风格的图标
TrafficLightButton.tsx: 交通灯按钮组件，macOS 风格窗口控制按钮（关闭、最小化、最大化）

## 依赖关系
- 依赖 @/stores/useThemeStore 主题状态
- 依赖 @/components/ui Toast 组件
- 被窗口框架和应用消费

## 共享组件约束
1. 组件必须支持所有主题（Aqua/XP/Win98）
2. 组件必须响应式，支持移动端
3. 组件必须有清晰的 Props 接口
4. 组件必须支持无障碍（ARIA 属性）
5. 组件必须优化性能，避免不必要的重渲染
6. 组件必须有默认值，避免必填 Props
7. 组件必须有错误边界，避免崩溃

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
