/**
 * [INPUT]: appRegistryData, base/types, bookmark-board
 * [OUTPUT]: appRegistry, getAppIconPath, getNonFinderApps, getAppMetadata, getAppComponent, getWindowConfig, getMobileWindowSize
 * [POS]: 应用注册中心 —— 唯一决定"系统里有哪些应用"的地方
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { lazy, Suspense, ComponentType, useEffect } from "react";
import { type AppId } from "./appRegistryData";
import type { AppProps } from "@/apps/base/types";
import { useAppStore } from "@/stores/useAppStore";

export type { AppId };

// ─── 窗口约束 ─────────────────────────────────────────────────────────────────

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowConstraints {
  minSize?: WindowSize;
  maxSize?: WindowSize;
  defaultSize: WindowSize;
  mobileDefaultSize?: WindowSize;
  mobileSquare?: boolean;
}

const defaultWindowConstraints: WindowConstraints = {
  defaultSize: { width: 730, height: 475 },
  minSize: { width: 300, height: 200 },
};

// ─── 懒加载基础设施 ──────────────────────────────────────────────────────────

const LoadSignal = ({ instanceId }: { instanceId?: string }) => {
  const markInstanceAsLoaded = useAppStore(
    (state) => state.markInstanceAsLoaded
  );
  useEffect(() => {
    if (instanceId) {
      if ("requestIdleCallback" in window) {
        const handle = window.requestIdleCallback(
          () => markInstanceAsLoaded(instanceId),
          { timeout: 1000 }
        );
        return () => window.cancelIdleCallback(handle);
      } else {
        const timer = setTimeout(
          () => markInstanceAsLoaded(instanceId),
          50
        );
        return () => clearTimeout(timer);
      }
    }
  }, [instanceId, markInstanceAsLoaded]);
  return null;
};

const lazyComponentCache = new Map<string, ComponentType<AppProps<unknown>>>();

function createLazyComponent<T = unknown>(
  importFn: () => Promise<{ default: ComponentType<AppProps<T>> }>,
  cacheKey: string
): ComponentType<AppProps<T>> {
  const cached = lazyComponentCache.get(cacheKey);
  if (cached) return cached as ComponentType<AppProps<T>>;

  const LazyComponent = lazy(importFn);

  const Wrapped = (props: AppProps<T>) => (
    <Suspense fallback={null}>
      <LazyComponent {...props} />
      <LoadSignal instanceId={props.instanceId} />
    </Suspense>
  );

  lazyComponentCache.set(
    cacheKey,
    Wrapped as ComponentType<AppProps<unknown>>
  );
  return Wrapped;
}

// ─── 懒加载组件 ──────────────────────────────────────────────────────────────

const LazyBookmarksApp = createLazyComponent<unknown>(
  () =>
    import(
      "@/apps/bookmarks/components/BookmarkBoardApp"
    ).then((m) => ({ default: m.BookmarkBoardApp })),
  "bookmarks"
);

const LazyThemeEditorApp = createLazyComponent<unknown>(
  () =>
    import(
      "@/apps/theme-editor/components/ThemeEditorApp"
    ).then((m) => ({ default: m.ThemeEditorApp })),
  "theme-editor"
);

// ─── 元数据 ──────────────────────────────────────────────────────────────────

import {
  appMetadata as bookmarkBoardMetadata,
  helpItems as bookmarkBoardHelpItems,
} from "@/apps/bookmarks/metadata";

import {
  appMetadata as themeEditorMetadata,
  helpItems as themeEditorHelpItems,
} from "@/apps/theme-editor/metadata";

// ─── 注册表 ──────────────────────────────────────────────────────────────────
// Kyo.is: Only 2 apps (Finder and Applet Viewer removed)

export const appRegistry = {
  "bookmarks": {
    id: "bookmarks" as const,
    name: "Bookmarks",
    icon: { type: "image" as const, src: bookmarkBoardMetadata.icon },
    description: "Your spatial bookmark manager",
    component: LazyBookmarksApp,
    helpItems: bookmarkBoardHelpItems,
    metadata: bookmarkBoardMetadata,
    windowConfig: {
      defaultSize: { width: 600, height: 460 },
      minSize: { width: 360, height: 300 },
    } as WindowConstraints,
  },
  "theme-editor": {
    id: "theme-editor" as const,
    name: "Theme Editor",
    icon: { type: "image" as const, src: "/icons/default/palette.png" },
    description: "Customize your theme",
    component: LazyThemeEditorApp,
    helpItems: themeEditorHelpItems,
    metadata: themeEditorMetadata,
    windowConfig: {
      defaultSize: { width: 680, height: 520 },
      minSize: { width: 600, height: 450 },
    } as WindowConstraints,
  },
} as const;

// ─── 工具函数 ────────────────────────────────────────────────────────────────

const FALLBACK_ICON = "/icons/default/application.png";

export const getAppIconPath = (appId: AppId): string => {
  const app = appRegistry[appId as keyof typeof appRegistry];
  if (!app?.icon) return FALLBACK_ICON;
  return typeof app.icon === "string" ? app.icon : app.icon.src;
};

export const getNonFinderApps = (
  _isAdmin = false
): Array<{ name: string; icon: string; id: AppId }> =>
  Object.entries(appRegistry).map(([id, app]) => ({
    name: app.name,
    icon: getAppIconPath(id as AppId),
    id: id as AppId,
  }));

export const getAppMetadata = (appId: AppId) => appRegistry[appId].metadata;

export const getAppComponent = (appId: AppId) => {
  const app = appRegistry[appId];
  if (!app) {
    console.warn(`[appRegistry] App "${appId}" not found`);
    return null;
  }
  return app.component;
};

export const getWindowConfig = (appId: AppId): WindowConstraints => {
  const app = appRegistry[appId];
  if (!app) {
    console.warn(`[appRegistry] App "${appId}" not found, using default config`);
    return defaultWindowConstraints;
  }
  return app.windowConfig || defaultWindowConstraints;
};

export const getMobileWindowSize = (appId: AppId): WindowSize => {
  const config = getWindowConfig(appId);
  if (config.mobileDefaultSize) return config.mobileDefaultSize;
  if (config.mobileSquare)
    return { width: window.innerWidth, height: window.innerWidth };
  return { width: window.innerWidth, height: config.defaultSize.height };
};
