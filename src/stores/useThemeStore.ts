/**
 * [INPUT]: 依赖 zustand 的 create，依赖 themes/types 的主题类型定义，依赖 themeSchema 壁纸配置
 * [OUTPUT]: 对外提供 useThemeStore hook，主题状态管理（当前主题、主题切换、壁纸联动、遗留 CSS 加载）
 * [POS]: stores/ 的主题状态管理，被所有组件消费，控制全局主题切换和 CSS 加载
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { OsThemeId } from "@/themes/types";
import { getThemeDefaultWallpaper, type PresetSkinId } from "@/themes/themeSchema";

interface ThemeState {
  current: OsThemeId;
  /** 是否在切换主题时同步切换壁纸 */
  syncWallpaper: boolean;
  setTheme: (theme: OsThemeId, options?: { syncWallpaper?: boolean }) => void;
  setSyncWallpaper: (sync: boolean) => void;
  hydrate: () => void;
}

// Dynamically manage loading/unloading of legacy Windows CSS (xp.css variants)
let legacyCssLink: HTMLLinkElement | null = null;

async function ensureLegacyCss(theme: OsThemeId) {
  // Only xp and win98 use xp.css
  if (theme !== "xp" && theme !== "win98") {
    if (legacyCssLink) {
      legacyCssLink.remove();
      legacyCssLink = null;
    }
    return;
  }

  const desiredVariant = theme === "xp" ? "XP" : "98";
  const currentVariant = legacyCssLink?.dataset.variant;
  if (currentVariant === desiredVariant) return; // already loaded

  try {
    // Use our forked CSS files from public directory
    const href = theme === "xp" ? "/css/xp-custom.css" : "/css/98-custom.css";

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.role = "legacy-win-css";
    link.dataset.variant = desiredVariant;

    // Replace existing link if present
    if (legacyCssLink) legacyCssLink.replaceWith(link);
    else document.head.appendChild(link);
    legacyCssLink = link;
  } catch (e) {
    console.error(
      "Failed to load legacy Windows CSS variant",
      desiredVariant,
      e
    );
  }
}

// Storage keys
const THEME_KEY = "kyo:theme";
const LEGACY_THEME_KEY = "ryos:theme"; // Migration from ryOS
const SYNC_WALLPAPER_KEY = "kyo:theme-sync-wallpaper";

/**
 * 切换壁纸（延迟导入避免循环依赖）
 */
async function switchWallpaper(themeId: PresetSkinId) {
  const wallpaper = getThemeDefaultWallpaper(themeId);
  // 动态导入 displaySettingsStore 避免循环依赖
  const { useDisplaySettingsStore } = await import("./useDisplaySettingsStore");
  useDisplaySettingsStore.getState().setWallpaper(wallpaper);
}

const createThemeStore = () => create<ThemeState>((set, get) => ({
  current: "macosx",
  syncWallpaper: true, // 默认开启壁纸联动

  setTheme: (theme, options) => {
    set({ current: theme });
    localStorage.setItem(THEME_KEY, theme);
    // Clean up legacy key
    localStorage.removeItem(LEGACY_THEME_KEY);
    document.documentElement.dataset.osTheme = theme;
    ensureLegacyCss(theme);

    // 壁纸联动：如果启用且未显式禁用
    const shouldSyncWallpaper = options?.syncWallpaper ?? get().syncWallpaper;
    if (shouldSyncWallpaper) {
      switchWallpaper(theme as PresetSkinId);
    }
  },

  setSyncWallpaper: (sync) => {
    set({ syncWallpaper: sync });
    localStorage.setItem(SYNC_WALLPAPER_KEY, String(sync));
  },

  hydrate: () => {
    // 恢复壁纸同步设置
    const savedSync = localStorage.getItem(SYNC_WALLPAPER_KEY);
    if (savedSync !== null) {
      set({ syncWallpaper: savedSync === "true" });
    }

    // Try new key first, fall back to legacy
    let saved = localStorage.getItem(THEME_KEY) as OsThemeId | null;
    if (!saved) {
      saved = localStorage.getItem(LEGACY_THEME_KEY) as OsThemeId | null;
      if (saved) {
        // Migrate to new key
        localStorage.setItem(THEME_KEY, saved);
        localStorage.removeItem(LEGACY_THEME_KEY);
      }
    }
    const theme = saved || "macosx";
    set({ current: theme });
    document.documentElement.dataset.osTheme = theme;
    ensureLegacyCss(theme);
  },
}));

// Preserve store across Vite HMR to prevent theme flashing during development
let useThemeStore = createThemeStore();
if (import.meta.hot) {
  const data = import.meta.hot.data as { useThemeStore?: typeof useThemeStore };
  if (data.useThemeStore) {
    useThemeStore = data.useThemeStore;
  } else {
    data.useThemeStore = useThemeStore;
  }
}
export { useThemeStore };
