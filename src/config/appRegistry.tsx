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


const LazyChatApp = createLazyComponent<unknown>(
  () =>
    import(
      "@/apps/chat/components/ChatApp"
    ).then((m) => ({ default: m.ChatAppComponent })),
  "chat"
);

const LazyControlPanelsApp = createLazyComponent<unknown>(
  () =>
    import(
      "@/apps/control-panels/components/ControlPanelsApp"
    ).then((m) => ({ default: m.ControlPanelsApp })),
  "control-panels"
);

const LazyStickiesApp = createLazyComponent<unknown>(
  () =>
    import(
      "@/apps/stickies/components/StickiesApp"
    ).then((m) => ({ default: m.StickiesApp })),
  "stickies"
);

const LazyHistoryApp = createLazyComponent<unknown>(
  () =>
    import(
      "@/apps/history/components/HistoryApp"
    ).then((m) => ({ default: m.HistoryApp })),
  "history"
);

const LazyWhiteNoiseApp = createLazyComponent<unknown>(
  () =>
    import(
      "@/apps/white-noise/components/WhiteNoiseApp"
    ).then((m) => ({ default: m.WhiteNoiseApp })),
  "white-noise"
);

// ─── 元数据 ──────────────────────────────────────────────────────────────────

import {
  appMetadata as bookmarkBoardMetadata,
  helpItems as bookmarkBoardHelpItems,
} from "@/apps/bookmarks/metadata";


import {
  appMetadata as controlPanelsMetadata,
  helpItems as controlPanelsHelpItems,
} from "@/apps/control-panels/metadata";

import {
  appMetadata as stickiesMetadata,
  helpItems as stickiesHelpItems,
} from "@/apps/stickies/metadata";

import {
  appMetadata as historyMetadata,
  helpItems as historyHelpItems,
} from "@/apps/history/metadata";

import {
  appMetadata as whiteNoiseMetadata,
  helpItems as whiteNoiseHelpItems,
} from "@/apps/white-noise/metadata";

// ─── 注册表 ──────────────────────────────────────────────────────────────────
// Kyo.is apps (Finder and Applet Viewer removed)

export const appRegistry = {
  "bookmarks": {
    id: "bookmarks" as const,
    icon: { type: "image" as const, src: bookmarkBoardMetadata.icon },
    component: LazyBookmarksApp,
    helpItems: bookmarkBoardHelpItems,
    metadata: bookmarkBoardMetadata,
    windowConfig: {
      defaultSize: { width: 600, height: 460 },
      minSize: { width: 360, height: 300 },
    } as WindowConstraints,
  },
  "chat": {
    id: "chat" as const,
    icon: { type: "image" as const, src: "/icons/macosx/question.png" },
    component: LazyChatApp,
    helpItems: [] as { icon: string; title: string; description: string }[],
    metadata: {
      name: "Chat",
      version: "1.0.0",
      icon: "/icons/macosx/question.png",
      creator: { name: "yeshu", url: "https://github.com/hiyeshu" },
      github: "https://github.com/hiyeshu/kyo.is",
    },
    windowConfig: {
      defaultSize: { width: 600, height: 500 },
      minSize: { width: 400, height: 300 },
    } as WindowConstraints,
  },
  "control-panels": {
    id: "control-panels" as const,
    icon: { type: "image" as const, src: controlPanelsMetadata.icon },
    component: LazyControlPanelsApp,
    helpItems: controlPanelsHelpItems,
    metadata: controlPanelsMetadata,
    windowConfig: {
      defaultSize: { width: 540, height: 480 },
      minSize: { width: 480, height: 400 },
    } as WindowConstraints,
  },
  "history": {
    id: "history" as const,
    icon: { type: "image" as const, src: historyMetadata.icon },
    component: LazyHistoryApp,
    helpItems: historyHelpItems,
    metadata: historyMetadata,
    windowConfig: {
      defaultSize: { width: 500, height: 450 },
      minSize: { width: 360, height: 300 },
    } as WindowConstraints,
  },
  "stickies": {
    id: "stickies" as const,
    icon: { type: "image" as const, src: stickiesMetadata.icon },
    component: LazyStickiesApp,
    helpItems: stickiesHelpItems,
    metadata: stickiesMetadata,
    windowConfig: {
      defaultSize: { width: 380, height: 220 },
      minSize: { width: 320, height: 180 },
    } as WindowConstraints,
  },
  "white-noise": {
    id: "white-noise" as const,
    icon: { type: "image" as const, src: "/icons/macosx/cdrom.png" },
    component: LazyWhiteNoiseApp,
    helpItems: whiteNoiseHelpItems,
    metadata: whiteNoiseMetadata,
    windowConfig: {
      defaultSize: { width: 360, height: 260 },
      minSize: { width: 300, height: 220 },
    } as WindowConstraints,
  },
} as const;

// ─── 工具函数 ────────────────────────────────────────────────────────────────

const FALLBACK_ICON = "/icons/default/application.png";

/**
 * 获取应用图标路径 - 支持主题感知
 * @param appId 应用 ID
 * @param theme 可选主题，不传则返回 metadata 中定义的默认路径
 * @returns 图标路径
 * 
 * 图标路径解析规则：
 * 1. 如果 metadata.icon 是完整路径（以 /icons/ 开头），提取文件名
 * 2. 根据主题构建路径：/icons/{theme}/{filename}
 * 3. 如果主题图标不存在，回退到 default
 */
export const getAppIconPath = (appId: AppId, theme?: string): string => {
  const app = appRegistry[appId as keyof typeof appRegistry];
  if (!app?.icon) return FALLBACK_ICON;
  
  let iconPath: string;
  if (typeof app.icon === "string") {
    iconPath = app.icon;
  } else {
    iconPath = app.icon.type === "image" ? app.icon.src : FALLBACK_ICON;
  }
  
  // 如果没有指定主题，返回原始路径
  if (!theme) return iconPath;
  
  // 提取文件名并根据主题构建路径
  const filename = iconPath.split("/").pop();
  if (!filename) return iconPath;
  
  // 构建主题路径
  return `/icons/${theme}/${filename}`;
};

export const getNonFinderApps = (
  _isAdmin = false,
  theme?: string
): Array<{ icon: string; id: AppId }> =>
  Object.entries(appRegistry).map(([id]) => ({
    icon: getAppIconPath(id as AppId, theme),
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
