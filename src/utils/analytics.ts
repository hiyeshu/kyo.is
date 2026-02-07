/**
 * Centralized analytics event constants for Kyo
 * 
 * Events follow the pattern: `category:action` or `app:action`
 * 
 * Usage:
 *   import { track } from "@vercel/analytics";
 *   import { APP_ANALYTICS } from "@/utils/analytics";
 *   track(APP_ANALYTICS.APP_LAUNCH, { appId: "bookmarks" });
 */

// Core application events
export const APP_ANALYTICS = {
  // App lifecycle
  APP_LAUNCH: "app:launch",
} as const;

// Type helpers for analytics event names
export type AppAnalyticsEvent = typeof APP_ANALYTICS[keyof typeof APP_ANALYTICS];
