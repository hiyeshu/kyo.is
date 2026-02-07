/**
 * [INPUT]: 依赖 React hooks (useEffect/useState)，依赖 apps/base/types 的应用类型，依赖 components/layout 的布局组件，依赖 config/appRegistry 的应用注册表，依赖 stores/useAppStore 的应用状态
 * [OUTPUT]: 对外提供 AppManager 组件，应用管理器核心（管理所有应用实例、窗口生命周期、层级控制、Exposé 视图）
 * [POS]: apps/base/ 的应用管理器，被 App.tsx 使用，是所有应用的容器和生命周期管理者
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useState, useCallback } from "react";
import type { AnyApp, AppState } from "./types";
import { MenuBar } from "@/components/layout/MenuBar";
import { Desktop } from "@/components/layout/Desktop";
import { Dock } from "@/components/layout/Dock";
import { ExposeView } from "@/components/layout/ExposeView";
import { AddWebsiteDialog } from "@/components/dialogs/AddWebsiteDialog";
import { CommandPalette } from "@/components/dialogs/CommandPalette";
import { RightClickMenu, MenuItem } from "@/components/ui/right-click-menu";
import { getAppComponent, appRegistry } from "@/config/appRegistry";
import type { AppId } from "@/config/appRegistry";
import { useAppStoreShallow } from "@/stores/helpers";
import { toast } from "sonner";
import { requestCloseWindow } from "@/utils/windowUtils";

interface AppManagerProps {
  apps: AnyApp[];
}

const BASE_Z_INDEX = 1;

export function AppManager({ apps }: AppManagerProps) {
  // Instance-based state
  const {
    instances,
    instanceOrder,
    launchApp,
    bringInstanceToForeground,
    navigateToNextInstance,
    navigateToPreviousInstance,
    exposeMode,
  } = useAppStoreShallow((state) => ({
    instances: state.instances,
    instanceOrder: state.instanceOrder,
    launchApp: state.launchApp,
    bringInstanceToForeground: state.bringInstanceToForeground,
    navigateToNextInstance: state.navigateToNextInstance,
    navigateToPreviousInstance: state.navigateToPreviousInstance,
    exposeMode: state.exposeMode,
  }));

  // For Mac/System7 themes, always show menubar for Kyo (bookmark-focused)
  // For XP/98, the menubar is actually a taskbar and should always show
  const showDesktopMenuBar = true;

  const [isInitialMount, setIsInitialMount] = useState(true);
  const [isExposeViewOpen, setIsExposeViewOpen] = useState(false);
  const [isAddWebsiteDialogOpen, setIsAddWebsiteDialogOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [desktopContextMenuPos, setDesktopContextMenuPos] = useState<{ x: number; y: number } | null>(null);


  // Create legacy-compatible appStates from instances for Desktop component
  // NOTE: There can be multiple open instances for the same appId. We need to
  // aggregate their state so that legacy consumers (e.g. Desktop)
  // still receive correct information. In particular, `isOpen` should be true
  // if ANY instance is open, and `isForeground` should reflect the foreground
  // instance. We also prefer the foreground instance for position/size data.

  const legacyAppStates = Object.values(instances).reduce(
    (acc, instance) => {
      const existing = acc[instance.appId];

      // Determine whether this instance should be the source of foreground /
      // positional data. We always keep foreground instance data if available.
      const shouldReplace =
        !existing || // first encounter
        (instance.isForeground && !existing.isForeground); // take foreground

      acc[instance.appId] = {
        // isOpen is true if any instance is open
        isOpen: (existing?.isOpen ?? false) || instance.isOpen,
        // isForeground true if this particular instance is foreground, or an
        // earlier one already marked foreground
        isForeground:
          (existing?.isForeground ?? false) || instance.isForeground,
        // For position / size / initialData, prefer the chosen instance
        position: shouldReplace ? instance.position : existing?.position,
        size: shouldReplace ? instance.size : existing?.size,
        initialData: shouldReplace
          ? instance.initialData
          : existing?.initialData,
      };

      return acc;
    },
    {} as { [appId: string]: AppState },
  );

  const getZIndexForInstance = (instanceId: string) => {
    const index = instanceOrder.indexOf(instanceId);
    if (index === -1) return BASE_Z_INDEX;
    return BASE_Z_INDEX + index + 1;
  };

  // Set isInitialMount to false after a short delay
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialMount(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Process direct app launch paths (Kyo.is: simplified, no share codes)
  useEffect(() => {
    const handleUrlNavigation = () => {
      const path = window.location.pathname;
      console.log("[AppManager] Checking path:", path);

      // Handle direct app launch path (e.g., /bookmarks, /theme-editor)
      if (path.startsWith("/") && path.length > 1) {
        const potentialAppId = path.substring(1).split("/")[0] as AppId;

        // Check if it's a valid app ID from the registry
        if (potentialAppId in appRegistry) {
          const appName = appRegistry[potentialAppId]?.name || potentialAppId;
          toast.info(`Launching ${appName}...`);

          setTimeout(() => {
            const event = new CustomEvent("launchApp", {
              detail: { appId: potentialAppId },
            });
            window.dispatchEvent(event);
            window.history.replaceState({}, "", "/");
          }, 100);
        } else {
          // Unknown path, clean URL
          window.history.replaceState({}, "", "/");
        }
      }
    };

    handleUrlNavigation();
  }, []); // Run only once on mount

  // Listen for app launch events (e.g., from Finder, URL handling)
  useEffect(() => {
    const handleAppLaunch = (
      event: CustomEvent<{
        appId: AppId;
        initialPath?: string;
        initialData?: unknown;
      }>,
    ) => {
      const { appId, initialPath, initialData } = event.detail;

      console.log(
        `[AppManager] Launch event received for ${appId}`,
        event.detail,
      );

      // Check if there's an existing instance before launching
      const existingInstance = Object.values(instances).find(
        (instance) => instance.appId === appId && instance.isOpen,
      );

      // Use instance system
      const instanceId = launchApp(appId, initialData);
      console.log(
        `[AppManager] Launched instance ${instanceId} for app ${appId}`,
      );

      // Store initialPath if provided
      if (initialPath) {
        localStorage.setItem(`ryos:app:${appId}:initial-path`, initialPath);
      }

      // If there was an existing instance and we have initialData, dispatch updateApp event
      if (existingInstance && initialData) {
        console.log(
          `[AppManager] Dispatching updateApp event for existing ${appId} instance with initialData:`,
          initialData,
        );
        const updateEvent = new CustomEvent("updateApp", {
          detail: { appId, initialData },
        });
        window.dispatchEvent(updateEvent);
      }
    };

    window.addEventListener("launchApp", handleAppLaunch as EventListener);
    return () => {
      window.removeEventListener("launchApp", handleAppLaunch as EventListener);
    };
  }, [instances, launchApp]);

  // Listen for expose view toggle events (e.g., from keyboard shortcut, dock menu)
  useEffect(() => {
    const handleExposeToggle = () => {
      setIsExposeViewOpen((prev) => !prev);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // F3 key to toggle Expose view (Mission Control)
      if (e.key === "F3") {
        e.preventDefault();
        setIsExposeViewOpen((prev) => !prev);
      }
      // ⌘F / Ctrl+F to toggle Command Palette (hijack browser find)
      if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener("toggleExposeView", handleExposeToggle);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("toggleExposeView", handleExposeToggle);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Global right-click handler for desktop
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if click is on desktop background (not on windows, dock, menubar)
      const isOnWindow = target.closest('[role="dialog"]') || target.closest('.window-frame');
      const isOnDock = target.closest('.dock-container') || target.closest('[data-dock]');
      const isOnMenuBar = target.closest('.menubar') || target.closest('[data-menubar]');
      const isOnDesktopIcon = target.closest('[data-desktop-icon]');

      // Only handle if clicking on desktop background
      if (!isOnWindow && !isOnDock && !isOnMenuBar && !isOnDesktopIcon) {
        e.preventDefault();
        e.stopPropagation();
        setDesktopContextMenuPos({ x: e.clientX, y: e.clientY });
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Desktop context menu items
  const getDesktopContextMenuItems = useCallback((): MenuItem[] => {
    return [
      {
        type: "item",
        label: "Add Website",
        onSelect: () => {
          setDesktopContextMenuPos(null);
          setIsAddWebsiteDialogOpen(true);
        },
      },
    ];
  }, []);

  return (
    <>
      {/* MenuBar: For XP/Win98, this is the taskbar (always shown).
          For Mac/System7, hide when a foreground app is loaded since
          the app renders its own MenuBar. */}
      {showDesktopMenuBar && <MenuBar />}
      {/* macOS Dock */}
      <Dock />
      {/* App Instances */}
      {Object.values(instances).map((instance) => {
        if (!instance.isOpen) return null;

        const appId = instance.appId as AppId;
        const AppComponent = getAppComponent(appId);

        // Skip invalid app instances (e.g., old app IDs from localStorage)
        if (!AppComponent) {
          console.warn(`[AppManager] Skipping invalid app instance: ${appId}`);
          return null;
        }

        const zIndex = getZIndexForInstance(instance.instanceId);

        return (
          <div
            key={instance.instanceId}
            style={{ zIndex: exposeMode ? 9999 : zIndex }}
            className="absolute inset-x-0 md:inset-x-auto w-full md:w-auto"
            role="presentation"
            onMouseDown={() => {
              if (!instance.isForeground && !exposeMode) {
                bringInstanceToForeground(instance.instanceId);
              }
            }}
            onTouchStart={() => {
              if (!instance.isForeground && !exposeMode) {
                bringInstanceToForeground(instance.instanceId);
              }
            }}
          >
            <AppComponent
              isWindowOpen={instance.isOpen}
              isForeground={exposeMode ? false : instance.isForeground}
              onClose={() => requestCloseWindow(instance.instanceId)}
              className="pointer-events-auto"
              helpItems={apps.find((app) => app.id === appId)?.helpItems}
              skipInitialSound={isInitialMount}
              initialData={instance.initialData as unknown}
              instanceId={instance.instanceId}
              title={instance.title}
              onNavigateNext={() => navigateToNextInstance(instance.instanceId)}
              onNavigatePrevious={() =>
                navigateToPreviousInstance(instance.instanceId)
              }
            />
          </div>
        );
      })}

      <Desktop
        apps={apps}
        toggleApp={(appId, initialData, launchOrigin) => {
          launchApp(appId, initialData, undefined, false, launchOrigin);
        }}
        appStates={{ windowOrder: instanceOrder, apps: legacyAppStates }}
      />

      {/* Expose View (Mission Control) - Backdrop and labels */}
      <ExposeView
        isOpen={isExposeViewOpen}
        onClose={() => setIsExposeViewOpen(false)}
      />

      <AddWebsiteDialog
        isOpen={isAddWebsiteDialogOpen}
        onOpenChange={setIsAddWebsiteDialogOpen}
      />

      <RightClickMenu
        position={desktopContextMenuPos}
        onClose={() => setDesktopContextMenuPos(null)}
        items={getDesktopContextMenuItems()}
      />

      {/* Command Palette - ⌘F to search bookmarks */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
      />
    </>
  );
}
