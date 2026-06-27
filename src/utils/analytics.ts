/**
 * [INPUT]: 依赖浏览器 CustomEvent
 * [OUTPUT]: APP_ANALYTICS 事件名常量、trackAppEvent 轻量事件边界
 * [POS]: utils/ 的埋点抽象层，隔离 Cloudflare/PostHog 等供应商选择
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// Core application events
export const APP_ANALYTICS = {
  // App lifecycle
  APP_LAUNCH: "app:launch",
} as const;

// Type helpers for analytics event names
export type AppAnalyticsEvent = typeof APP_ANALYTICS[keyof typeof APP_ANALYTICS];

export function trackAppEvent(
  event: AppAnalyticsEvent,
  properties: Record<string, unknown> = {}
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("kyo:analytics", { detail: { event, properties } }));
}
