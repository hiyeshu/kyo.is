# components/shared/
> L2 | 父级: /src/components/CLAUDE.md

## 成员清单

BookmarkFaviconImg.tsx: 书签 favicon 渲染器，三层回退状态机（Google S2 → LinkMeta 缓存 → 首字母 Emoji），加载成功后 canvas 转 128x128 base64 写回 store 实现本地化缓存（零网络请求），CORS 降级机制保证兼容性
PrefetchToast.tsx: 预加载提示组件，显示资源预加载进度、桌面应用更新提示
ThemedIcon.tsx: 主题图标组件，根据当前主题显示不同风格的图标
TrafficLightButton.tsx: 交通灯按钮组件，macOS 风格窗口控制按钮（关闭、最小化、最大化）

## 依赖关系
- 依赖 @/stores/useThemeStore 主题状态
- 依赖 @/stores/useBookmarkStore 书签状态（BookmarkFaviconImg 写回 faviconResolved）
- 依赖 @/stores/useLinkMetaStore 链接元数据缓存（BookmarkFaviconImg 查询缓存 favicon）
- 依赖 @/components/ui Toast 组件
- 被窗口框架和应用消费
- BookmarkFaviconImg 被 BookmarkIconDisplay / Desktop / Dock / CommandPalette 消费

## 共享组件约束
1. 组件必须支持所有主题（Aqua/XP/Win98）
2. 组件必须响应式，支持移动端
3. 组件必须有清晰的 Props 接口
4. 组件必须支持无障碍（ARIA 属性）
5. 组件必须优化性能，避免不必要的重渲染
6. 组件必须有默认值，避免必填 Props
7. 组件必须有错误边界，避免崩溃

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
