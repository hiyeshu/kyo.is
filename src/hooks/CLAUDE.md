# hooks/
> L2 | 父级: /src/CLAUDE.md

## 成员清单

useActivityLabel.ts: 活动标签 hook，根据应用状态生成动态标签文本，用于 Dock 菜单显示
useAudioTranscription.ts: 音频转录 hook，调用 /api/audio-transcribe，支持语音消息转文字，进度回调
useAuth.ts: 认证 hook，管理用户登录状态、令牌、用户信息，调用 /api/auth 端点
useEventListener.ts: 事件监听 hook，自动清理的 DOM 事件监听器，支持 window/document/element
useInterval.ts: 定时器 hook，自动清理的 setInterval，支持暂停/恢复
useIsMobile.ts: 移动端检测 hook，监听窗口宽度变化，返回是否为移动设备（< 768px）
useIsPhone.ts: 手机检测 hook，监听窗口宽度变化，返回是否为手机（< 640px）
useLatestRef.ts: 最新值引用 hook，保持 ref 始终指向最新值，避免闭包陷阱
useLaunchApp.ts: 应用启动 hook，处理应用启动逻辑、动画、音效、实例管理
useLongPress.ts: 长按检测 hook，支持触摸和鼠标，可配置延迟时间
useMediaQuery.ts: 媒体查询 hook，监听 CSS 媒体查询变化，返回匹配状态
useOffline.ts: 离线检测 hook，监听网络状态，显示离线提示 Toast
useResizeObserver.ts: 尺寸监听 hook，使用 ResizeObserver API 监听元素尺寸变化
useSound.ts: 音效播放 hook，管理系统音效、音量、预加载，支持多种音效类型
useSwipeNavigation.ts: 滑动导航 hook，检测触摸滑动手势，用于移动端导航
useTimeout.ts: 延迟执行 hook，自动清理的 setTimeout，支持取消
useToast.ts: Toast 通知 hook，封装 sonner 库，统一 Toast 接口
useTranslatedHelpItems.ts: 翻译帮助项 hook，根据当前语言返回翻译后的帮助菜单项
useVibration.ts: 震动反馈 hook，调用 Vibration API，支持移动设备触觉反馈
useWallpaper.ts: 壁纸管理 hook，加载壁纸、视频壁纸、预加载优化
useWindowInsets.ts: 窗口安全区 hook，计算主题相关的安全区域（Dock/Taskbar/MenuBar）
useWindowManager.ts: 窗口管理核心 hook，处理窗口拖拽、缩放、最小化、层级、位置持久化

## 依赖关系
- 依赖 React hooks (useState, useEffect, useCallback, useRef)
- 依赖 @/stores 全局状态
- 依赖 @/config 配置文件
- 依赖 @/types 类型定义
- 被所有组件和应用消费

## Hooks 设计约束
1. 所有 hooks 必须以 use 开头
2. 副作用必须在 useEffect 中执行，并正确清理
3. 事件监听器必须在组件卸载时移除
4. 定时器必须在组件卸载时清除
5. 避免在 hooks 中直接修改 DOM，使用 ref
6. 复杂逻辑使用 useCallback/useMemo 优化性能
7. 自定义 hooks 应该是纯函数，无副作用（除非明确需要）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
