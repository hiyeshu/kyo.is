/**
 * [INPUT]: 依赖 apps/base/types 的应用类型，依赖 config/appRegistry 的应用配置，依赖 hooks/useWallpaper 的壁纸管理，依赖 hooks/useLongPress 的长按检测，依赖 stores/useThemeStore 的主题状态
 * [OUTPUT]: 对外提供 Desktop 组件，桌面环境核心（壁纸显示、桌面图标、右键菜单、应用启动）
 * [POS]: components/layout/ 的桌面组件，被 App.tsx 使用，是桌面环境的主容器
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { AnyApp } from "@/apps/base/types";
import { AppId, getAppIconPath } from "@/config/appRegistry";
import { useState, useRef, useCallback } from "react";
import { useWallpaper } from "@/hooks/useWallpaper";
import { RightClickMenu, MenuItem } from "@/components/ui/right-click-menu";
import { useLongPress } from "@/hooks/useLongPress";
import { useThemeStore } from "@/stores/useThemeStore";
import type { LaunchOriginRect } from "@/stores/useAppStore";
import { useEventListener } from "@/hooks/useEventListener";
import { getTranslatedAppName } from "@/utils/i18n";
import { useTranslation } from "react-i18next";

interface DesktopStyles {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundRepeat?: string;
  backgroundPosition?: string;
  transition?: string;
}

interface DesktopProps {
  apps: AnyApp[];
  appStates: import("@/apps/base/types").AppManagerState;
  toggleApp: (
    appId: AppId,
    initialData?: unknown,
    launchOrigin?: LaunchOriginRect
  ) => void;
  onClick?: () => void;
  desktopStyles?: DesktopStyles;
}

/**
 * 简化版桌面 — 壁纸 + 应用图标，去掉了 Finder 文件系统依赖
 */
export function Desktop({
  apps,
  toggleApp,
  onClick,
  desktopStyles,
}: DesktopProps) {
  const { t } = useTranslation();
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const { wallpaperSource, isVideoWallpaper } = useWallpaper();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [contextMenuAppId, setContextMenuAppId] = useState<string | null>(null);

  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  const isTauriApp =
    typeof window !== "undefined" && "__TAURI__" in window;

  // ─── Video wallpaper playback ─────────────────────────────────────
  const resumeVideoPlayback = useCallback(async () => {
    if (!isVideoWallpaper || !videoRef.current) return;
    const video = videoRef.current;
    try {
      if (video.ended) video.currentTime = 0;
      if (video.readyState >= 3) {
        await video.play();
      } else {
        const h = () => {
          video.play().catch(() => {});
          video.removeEventListener("canplay", h);
        };
        video.addEventListener("canplay", h);
      }
    } catch {
      /* ignore */
    }
  }, [isVideoWallpaper]);

  useEventListener(
    "visibilitychange",
    useCallback(() => {
      if (document.visibilityState === "visible") resumeVideoPlayback();
    }, [resumeVideoPlayback]),
    isVideoWallpaper ? document : null
  );
  useEventListener(
    "focus",
    useCallback(() => resumeVideoPlayback(), [resumeVideoPlayback]),
    isVideoWallpaper ? window : null
  );
  useEventListener(
    "canplaythrough",
    useCallback(() => {
      if (isVideoWallpaper && videoRef.current?.paused)
        videoRef.current.play().catch(() => {});
    }, [isVideoWallpaper]),
    isVideoWallpaper ? videoRef : null
  );

  // ─── Long-press for mobile ────────────────────────────────────────
  const longPressHandlers = useLongPress((e) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-desktop-icon]")) return;
    const touch = e.touches[0];
    setContextMenuPos({ x: touch.clientX, y: touch.clientY });
    setContextMenuAppId(null);
  });

  // ─── Wallpaper style ──────────────────────────────────────────────
  const getWallpaperStyles = (path: string): DesktopStyles => {
    const fallback = { backgroundColor: "#ececec" };
    if (!path || isVideoWallpaper) return fallback;
    const isTiled = path.includes("/wallpapers/tiles/");
    return {
      ...fallback,
      backgroundImage: `url(${path})`,
      backgroundSize: isTiled ? "64px 64px" : "cover",
      backgroundRepeat: isTiled ? "repeat" : "no-repeat",
      backgroundPosition: "center",
      transition: "background-image 0.3s ease-in-out",
    };
  };

  const finalStyles = {
    ...getWallpaperStyles(wallpaperSource),
    ...desktopStyles,
  };

  // ─── App list (filtered) ──────────────────────────────────────────
  const displayedApps = apps.sort((a, b) => a.name.localeCompare(b.name));

  // ─── Context menu ─────────────────────────────────────────────────
  const getContextMenuItems = (): MenuItem[] => {
    if (contextMenuAppId) {
      return [
        {
          type: "item",
          label: t("apps.finder.contextMenu.open", "Open"),
          onSelect: () => {
            toggleApp(contextMenuAppId as AppId);
            setContextMenuPos(null);
            setContextMenuAppId(null);
          },
        },
      ];
    }
    return [];
  };

  return (
    <div
      className="absolute inset-0 min-h-screen h-full z-[-1] desktop-background"
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
        setContextMenuAppId(null);
      }}
      style={finalStyles}
      {...longPressHandlers}
    >
      {/* Video wallpaper */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover z-[-10]"
        src={wallpaperSource}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        data-webkit-playsinline="true"
        style={{ display: isVideoWallpaper ? "block" : "none" }}
      />

      {/* Tauri drag area */}
      {isTauriApp && isXpTheme && (
        <div
          className="fixed top-0 left-0 right-0 z-[100]"
          style={{ height: 32, cursor: "default" }}
          onMouseDown={async (e) => {
            if (e.buttons !== 1) return;
            try {
              const { getCurrentWindow } = await import(
                "@tauri-apps/api/window"
              );
              if (e.detail === 2) await getCurrentWindow().toggleMaximize();
              else await getCurrentWindow().startDragging();
            } catch {
              /* ignore */
            }
          }}
        />
      )}

      {/* Desktop icons */}
      <div
        className={`flex flex-col relative z-[1] ${
          isXpTheme ? "items-start pt-2" : "items-end pt-8"
        }`}
        style={
          isXpTheme
            ? {
                height:
                  "calc(100% - (30px + var(--sat-safe-area-bottom) + 48px))",
                paddingTop: isTauriApp ? 36 : undefined,
                paddingLeft: "calc(0.25rem + env(safe-area-inset-left, 0px))",
                paddingRight: "calc(0.5rem + env(safe-area-inset-right, 0px))",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }
            : {
                height: "calc(100% - 2rem)",
                padding: "1rem",
                paddingTop: "2rem",
                paddingLeft: "calc(1rem + env(safe-area-inset-left, 0px))",
                paddingRight: "calc(1rem + env(safe-area-inset-right, 0px))",
                paddingBottom:
                  "calc(1rem + env(safe-area-inset-bottom, 0px))",
              }
        }
      >
        <div
          className={
            isXpTheme
              ? "flex flex-col flex-wrap justify-start content-start h-full gap-y-2 gap-x-px"
              : "flex flex-col flex-wrap-reverse justify-start content-start h-full gap-y-2 gap-x-px"
          }
        >
          {displayedApps.map((app) => (
            <DesktopIcon
              key={app.id}
              label={getTranslatedAppName(app.id as AppId)}
              icon={getAppIconPath(app.id as AppId)}
              isSelected={selectedAppId === app.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAppId(app.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                toggleApp(app.id as AppId, undefined, {
                  x: rect.left,
                  y: rect.top,
                  width: rect.width,
                  height: rect.height,
                });
                setSelectedAppId(null);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenuPos({ x: e.clientX, y: e.clientY });
                setContextMenuAppId(app.id);
                setSelectedAppId(app.id);
              }}
            />
          ))}
        </div>
      </div>

      <RightClickMenu
        position={contextMenuPos}
        onClose={() => {
          setContextMenuPos(null);
          setContextMenuAppId(null);
        }}
        items={getContextMenuItems()}
      />
    </div>
  );
}

// ─── Simple desktop icon (replaces Finder's FileIcon) ───────────────

function DesktopIcon({
  label,
  icon,
  isSelected,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  label: string;
  icon: string;
  isSelected: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      data-desktop-icon="true"
      className={`flex flex-col items-center justify-start w-[72px] cursor-default select-none`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <div className="w-10 h-10 flex items-center justify-center mb-0.5">
        <img
          src={icon}
          alt={label}
          className="max-w-full max-h-full pointer-events-none"
          draggable={false}
        />
      </div>
      <span
        className={`text-[11px] leading-tight text-center break-words max-w-full px-0.5 rounded ${
          isSelected
            ? "bg-[Highlight] text-[HighlightText]"
            : "text-gray-900 [text-shadow:_0_1px_1px_rgb(255_255_255_/_80%)]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
