/**
 * [INPUT]: 依赖 apps/base/AppManager 的应用管理器，依赖 config/appRegistry 的应用注册表，依赖 stores 的全局状态，依赖 hooks 的自定义 hooks，依赖 i18next 的国际化
 * [OUTPUT]: 对外提供 App 根组件，管理应用启动流程、主题切换、离线检测、Toast 配置、屏保覆盖层
 * [POS]: src/ 的根组件，被 main.tsx 渲染，是整个前端应用的容器和生命周期管理者
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { AppManager } from "./apps/base/AppManager";
import { appRegistry } from "./config/appRegistry";
import { useEffect, useState, useMemo } from "react";
import { applyDisplayMode } from "./utils/displayMode";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { useAppStoreShallow, useDisplaySettingsStoreShallow } from "@/stores/helpers";
import { BootScreen } from "./components/dialogs/BootScreen";
import { getNextBootMessage, clearNextBootMessage, isBootDebugMode } from "./utils/bootMessage";
import { AnyApp } from "./apps/base/types";
import { useThemeStore } from "./stores/useThemeStore";
import { useIsMobile } from "./hooks/useIsMobile";
import { useOffline } from "./hooks/useOffline";
import { useTranslation } from "react-i18next";
import { isTauri } from "./utils/platform";
import { checkDesktopUpdate, onDesktopUpdate, DesktopUpdateResult } from "./utils/prefetch";
import { DownloadSimple } from "@phosphor-icons/react";
import { ScreenSaverOverlay } from "./components/screensavers/ScreenSaverOverlay";

// Convert registry to array
const apps: AnyApp[] = Object.values(appRegistry);

export function App() {
  const { t } = useTranslation();
  const { isFirstBoot, setHasBooted, setLastSeenDesktopVersion } = useAppStoreShallow(
    (state) => ({
      isFirstBoot: state.isFirstBoot,
      setHasBooted: state.setHasBooted,
      setLastSeenDesktopVersion: state.setLastSeenDesktopVersion,
    })
  );
  const displayMode = useDisplaySettingsStoreShallow((state) => state.displayMode);
  const currentTheme = useThemeStore((state) => state.current);
  const isMobile = useIsMobile();
  // Initialize offline detection
  useOffline();

  // Determine toast position and offset based on theme and device
  const toastConfig = useMemo(() => {
    const isWindowsTheme = currentTheme === "xp" || currentTheme === "win98";
    const dockHeight = currentTheme === "macosx" ? 56 : 0;
    const taskbarHeight = isWindowsTheme ? 30 : 0;
    
    // Mobile: always show at bottom-center with dock/taskbar and safe area clearance
    if (isMobile) {
      const bottomOffset = dockHeight + taskbarHeight + 16;
      return {
        position: "bottom-center" as const,
        offset: `calc(env(safe-area-inset-bottom, 0px) + ${bottomOffset}px)`,
      };
    }

    if (isWindowsTheme) {
      // Windows themes: bottom-right with taskbar clearance (30px + padding)
      return {
        position: "bottom-right" as const,
        offset: `calc(env(safe-area-inset-bottom, 0px) + 42px)`,
      };
    } else {
      // macOS themes: top-right with menubar clearance
      const menuBarHeight = currentTheme === "system7" ? 30 : 25;
      return {
        position: "top-right" as const,
        offset: `${menuBarHeight + 12}px`,
      };
    }
  }, [currentTheme, isMobile]);

  const [bootScreenMessage, setBootScreenMessage] = useState<string | null>(
    null
  );
  const [showBootScreen, setShowBootScreen] = useState(false);
  const [bootDebugMode, setBootDebugMode] = useState(false);

  useEffect(() => {
    applyDisplayMode(displayMode);
  }, [displayMode]);

  useEffect(() => {
    // Only show boot screen for system operations (reset/restore/format/debug)
    const persistedMessage = getNextBootMessage();
    if (persistedMessage) {
      setBootScreenMessage(persistedMessage);
      setBootDebugMode(isBootDebugMode());
      setShowBootScreen(true);
    }

    // Set first boot flag without showing boot screen
    if (isFirstBoot) {
      setHasBooted();
    }
  }, [isFirstBoot, setHasBooted]);

  // Show download toast for macOS users when new desktop version is available
  // For web: show on first visit and updates
  // For Tauri: only show on updates (not first time)
  // TODO: 启用桌面版下载提示时，删除下面的 return
  useEffect(() => {
    // 暂时禁用，等发布桌面版后再启用
    return;

    const isMacOS = navigator.platform.toLowerCase().includes("mac");
    const isInTauri = isTauri();

    if (!isMacOS) {
      return;
    }

    // Handler for showing the desktop update toast
    const showDesktopUpdateToast = (result: DesktopUpdateResult) => {
      if (result.type === 'update' && result.version) {
        // Mark as seen immediately so dismissing the toast won't show it again
        setLastSeenDesktopVersion(result.version);
        // New version available - show update toast (both web and Tauri)
        toast(`Kyo ${result.version} for Mac is available`, {
          id: 'desktop-update',
          icon: <DownloadSimple className="h-4 w-4" weight="bold" />,
          duration: Infinity,
          action: {
            label: "Download",
            onClick: () => {
              window.open(
                `https://github.com/hiyeshu/kyo.is/releases/download/v${result.version}/Kyo_${result.version}_aarch64.dmg`,
                "_blank"
              );
            },
          },
        });
      } else if (result.type === 'first-time' && result.version && !isInTauri) {
        // Mark as seen immediately so dismissing the toast won't show it again
        setLastSeenDesktopVersion(result.version);
        // First time user on web - show initial download toast (not in Tauri)
        toast("Kyo is available as a Mac app", {
          id: 'desktop-update',
          icon: <DownloadSimple className="h-4 w-4" weight="bold" />,
          duration: Infinity,
          action: {
            label: "Download",
            onClick: () => {
              window.open(
                `https://github.com/hiyeshu/kyo.is/releases/download/v${result.version}/Kyo_${result.version}_aarch64.dmg`,
                "_blank"
              );
            },
          },
        });
      } else if (result.type === 'first-time' && result.version && isInTauri) {
        // First time in Tauri - just store the version without showing toast
        setLastSeenDesktopVersion(result.version);
      }
    };

    // Register callback for periodic/manual update checks
    onDesktopUpdate(showDesktopUpdateToast);

    // Initial check on load (delayed to let app render first)
    const timer = setTimeout(async () => {
      const result = await checkDesktopUpdate();
      showDesktopUpdateToast(result);
    }, 2000);

    return () => clearTimeout(timer);
  }, [setLastSeenDesktopVersion]);

  if (showBootScreen) {
    return (
      <BootScreen
        isOpen={true}
        onOpenChange={() => {}}
        title={bootScreenMessage || t("common.system.systemRestoring")}
        debugMode={bootDebugMode}
        onBootComplete={() => {
          clearNextBootMessage();
          setShowBootScreen(false);
        }}
      />
    );
  }

  return (
    <>
      <AppManager apps={apps} />
      <Toaster position={toastConfig.position} offset={toastConfig.offset} />
      <ScreenSaverOverlay />
    </>
  );
}
