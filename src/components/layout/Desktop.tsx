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
import { AddWebsiteDialog } from "@/components/dialogs/AddWebsiteDialog";
import { useLongPress } from "@/hooks/useLongPress";
import { useThemeStore } from "@/stores/useThemeStore";
import { useBookmarkStore, isFolder, openBookmarkUrl, getBookmarkIconInfo, type Bookmark } from "@/stores/useBookmarkStore";
import { useStickiesStore } from "@/stores/useStickiesStore";
import type { LaunchOriginRect } from "@/stores/useAppStore";
import { useEventListener } from "@/hooks/useEventListener";
import { getTranslatedAppName } from "@/utils/i18n";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/useIsMobile";

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
  onDoubleClick?: () => void;
  desktopStyles?: DesktopStyles;
}

/**
 * 简化版桌面 — 壁纸 + 应用图标，去掉了 Finder 文件系统依赖
 */
export function Desktop({
  apps: _apps,
  toggleApp,
  onClick,
  onDoubleClick,
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
  const [isAddWebsiteDialogOpen, setIsAddWebsiteDialogOpen] = useState(false);

  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  const isMacTheme = currentTheme === "macosx";
  const isTauriApp =
    typeof window !== "undefined" && "__TAURI__" in window;
  const isMobile = useIsMobile();

  // ─── Bookmarks for desktop (non-macOS themes) ──────────────────────
  const bookmarkStore = useBookmarkStore();
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(null);
  const [contextMenuBookmark, setContextMenuBookmark] = useState<Bookmark | null>(null);

  // Get top-level bookmarks (not in folders) for desktop display
  const desktopBookmarks = !isMacTheme
    ? (bookmarkStore.items.filter((item) => !isFolder(item)) as Bookmark[])
    : [];

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
    setContextMenuBookmark(null);
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
  // Non-macOS themes: show bookmarks app on desktop
  // macOS theme: bookmarks is in the Dock, no desktop icons needed
  const displayedApps: AnyApp[] = isMacTheme 
    ? [] 
    : _apps.filter(app => app.id === "bookmarks");

  // ─── Context menu ─────────────────────────────────────────────────
  const getContextMenuItems = (): MenuItem[] => {
    // Bookmark context menu
    if (contextMenuBookmark) {
      return [
        {
          type: "item",
          label: t("common.desktop.openLink", "打开链接"),
          onSelect: () => {
            window.open(contextMenuBookmark.url, "_blank", "noopener,noreferrer");
            setContextMenuPos(null);
            setContextMenuBookmark(null);
          },
        },
        {
          type: "item",
          label: t("common.dock.copyUrl", "复制链接"),
          onSelect: () => {
            navigator.clipboard.writeText(contextMenuBookmark.url);
            setContextMenuPos(null);
            setContextMenuBookmark(null);
          },
        },
        { type: "separator" },
        {
          type: "item",
          label: t("common.desktop.removeFromDesktop", "从桌面移除"),
          onSelect: () => {
            bookmarkStore.removeBookmark(contextMenuBookmark.id);
            setContextMenuPos(null);
            setContextMenuBookmark(null);
          },
        },
      ];
    }
    // App context menu
    if (contextMenuAppId) {
      return [
        {
          type: "item",
          label: t("apps.finder.contextMenu.open", "打开"),
          onSelect: () => {
            toggleApp(contextMenuAppId as AppId);
            setContextMenuPos(null);
            setContextMenuAppId(null);
          },
        },
      ];
    }
    // Desktop context menu (blank area)
    return [
      {
        type: "item",
        label: t("common.desktop.pasteLink", "粘贴链接"),
        onSelect: async () => {
          try {
            const text = await navigator.clipboard.readText();
            if (/^https?:\/\/\S+$/i.test(text.trim())) {
              document.dispatchEvent(
                new ClipboardEvent("paste", {
                  clipboardData: new DataTransfer(),
                })
              );
              // 触发粘贴处理器
              const event = new Event("kyo:paste-url");
              (event as unknown as { url: string }).url = text.trim();
              document.dispatchEvent(event);
            }
          } catch { /* clipboard permission denied */ }
        },
      },
      {
        type: "item",
        label: t("common.desktop.addNote", "新增便签"),
        onSelect: () => {
          useStickiesStore.getState().addNote(undefined, null, true);
        },
      },
      { type: "separator" },
      {
        type: "item",
        label: t("common.desktop.addWebsite", "新增网站"),
        onSelect: () => {
          setIsAddWebsiteDialogOpen(true);
        },
      },
      {
        type: "item",
        label: t("common.desktop.changeWallpaper", "更换壁纸"),
        onSelect: () => {
          toggleApp("control-panels" as AppId);
        },
      },
    ];
  };

  return (
    <div
      className="absolute inset-0 min-h-screen h-full z-0 desktop-background"
      onClick={onClick}
      onDoubleClick={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-desktop-icon]") && onDoubleClick) {
          onDoubleClick();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
        setContextMenuAppId(null);
        setContextMenuBookmark(null);
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
        className={`flex flex-col relative z-10 ${
          isXpTheme ? "items-start pt-2" : "items-end pt-8"
        }`}
        style={
          isXpTheme
            ? {
                pointerEvents: "auto",
                height:
                  "calc(100% - (30px + var(--sat-safe-area-bottom) + 48px))",
                paddingTop: isTauriApp ? 36 : undefined,
                paddingLeft: "calc(0.25rem + env(safe-area-inset-left, 0px))",
                paddingRight: "calc(0.5rem + env(safe-area-inset-right, 0px))",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }
            : {
                pointerEvents: "auto",
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
          {/* App icons */}
          {displayedApps.map((app) => (
            <DesktopIcon
              key={app.id}
              label={getTranslatedAppName(app.id as AppId)}
              icon={getAppIconPath(app.id as AppId)}
              isSelected={selectedAppId === app.id}
              theme={currentTheme}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAppId(app.id);
                setSelectedBookmarkId(null);
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
                setContextMenuBookmark(null);
                setSelectedAppId(app.id);
              }}
            />
          ))}
          
          {/* Bookmark icons (non-macOS themes only) */}
          {desktopBookmarks.map((bm) => (
            <BookmarkDesktopIcon
              key={bm.id}
              bookmark={bm}
              isSelected={selectedBookmarkId === bm.id}
              theme={currentTheme}
              onClick={(e) => {
                e.stopPropagation();
                // Mobile: single tap opens bookmark; Desktop: single click selects
                if (isMobile) {
                  openBookmarkUrl(bm.url);
                  setSelectedBookmarkId(null);
                } else {
                  setSelectedBookmarkId(bm.id);
                  setSelectedAppId(null);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                // Desktop: double click opens bookmark
                if (!isMobile) {
                  openBookmarkUrl(bm.url);
                  setSelectedBookmarkId(null);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenuPos({ x: e.clientX, y: e.clientY });
                setContextMenuBookmark(bm);
                setContextMenuAppId(null);
                setSelectedBookmarkId(bm.id);
              }}
            />
          ))}
        </div>
      </div>

      {/* Stickies are now rendered by StickyNotesLayer in App.tsx */}

      <RightClickMenu
        position={contextMenuPos}
        onClose={() => {
          setContextMenuPos(null);
          setContextMenuAppId(null);
          setContextMenuBookmark(null);
        }}
        items={getContextMenuItems()}
      />
      <AddWebsiteDialog
        isOpen={isAddWebsiteDialogOpen}
        onOpenChange={setIsAddWebsiteDialogOpen}
      />
    </div>
  );
}

// ─── Bookmark desktop icon ───────────────────────────────────────────

function BookmarkDesktopIcon({
  bookmark,
  isSelected,
  onClick,
  onDoubleClick,
  onContextMenu,
  theme,
}: {
  bookmark: Bookmark;
  isSelected: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
  theme: string;
}) {
  const isXpTheme = theme === "xp" || theme === "win98";
  
  // 使用单一真相源获取图标信息
  const iconInfo = getBookmarkIconInfo(bookmark);

  // 图标和容器样式 - 使用 CSS 变量
  const iconStyle: React.CSSProperties = {
    width: "var(--os-icon-desktop)",
    height: "var(--os-icon-desktop)",
  };

  return (
    <div
      data-desktop-icon="true"
      className="flex flex-col items-center justify-start cursor-default select-none"
      style={{ width: "calc(var(--os-icon-desktop) + 32px)" }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {/* Icon container - 使用 CSS 变量 */}
      <div 
        className="flex items-center justify-center mb-0.5 relative"
        style={{ width: "calc(var(--os-icon-desktop) + 8px)", height: "calc(var(--os-icon-desktop) + 8px)" }}
      >
        {iconInfo.isEmoji ? (
          // Emoji 图标
          <span 
            className="flex items-center justify-center text-3xl"
            style={iconStyle}
          >
            {iconInfo.value}
          </span>
        ) : isXpTheme ? (
          // XP/Win98: 直接显示图标，无圆角
          <img
            src={iconInfo.value}
            alt=""
            className="object-contain"
            style={iconStyle}
            draggable={false}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/icons/xp/ie-site.png";
            }}
          />
        ) : (
          // macOS Aqua: 圆角 + 阴影
          <div
            className="rounded-xl bg-white flex items-center justify-center overflow-hidden"
            style={{
              ...iconStyle,
              boxShadow: "0 2px 6px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)",
            }}
          >
            <img
              src={iconInfo.value}
              alt=""
              className="w-full h-full object-cover"
              style={{ imageRendering: "-webkit-optimize-contrast" }}
              draggable={false}
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-2xl">🌐</span>';
              }}
            />
          </div>
        )}
      </div>
      
      {/* Label - 使用 CSS 变量 */}
      <span
        className={`leading-tight text-center break-words max-w-full px-0.5 rounded ${
          isSelected
            ? "bg-[Highlight] text-[HighlightText]"
            : isXpTheme
            ? "text-white [text-shadow:_1px_1px_1px_rgb(0_0_0_/_90%)]"
            : "text-gray-900 [text-shadow:_0_1px_1px_rgb(255_255_255_/_80%)]"
        }`}
        style={{ 
          fontSize: "var(--os-text-xs)",
          fontFamily: isXpTheme ? '"Pixelated MS Sans Serif", Arial' : undefined,
        }}
      >
        {bookmark.title}
      </span>
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
  theme,
}: {
  label: string;
  icon: string;
  isSelected: boolean;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
  theme: string;
}) {
  const isXpTheme = theme === "xp" || theme === "win98";
  
  // 图标样式 - 使用 CSS 变量
  const iconStyle: React.CSSProperties = {
    width: "var(--os-icon-desktop)",
    height: "var(--os-icon-desktop)",
  };
  
  return (
    <div
      data-desktop-icon="true"
      className="flex flex-col items-center justify-start cursor-default select-none"
      style={{ width: "calc(var(--os-icon-desktop) + 32px)" }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {/* 图标容器 - 使用 CSS 变量 */}
      <div 
        className="flex items-center justify-center mb-0.5 relative"
        style={{ width: "calc(var(--os-icon-desktop) + 8px)", height: "calc(var(--os-icon-desktop) + 8px)" }}
      >
        {isXpTheme ? (
          // XP/Win98: 直接显示图标，无圆角
          <img
            src={icon}
            alt={label}
            className="object-contain pointer-events-none"
            style={iconStyle}
            draggable={false}
          />
        ) : (
          // macOS Aqua: 圆角 + 阴影
          <div
            className="rounded-xl bg-white flex items-center justify-center overflow-hidden"
            style={{
              ...iconStyle,
              boxShadow: "0 2px 6px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)",
            }}
          >
            <img
              src={icon}
              alt={label}
              className="w-full h-full object-cover pointer-events-none"
              style={{ imageRendering: "-webkit-optimize-contrast" }}
              draggable={false}
            />
          </div>
        )}
      </div>
      <span
        className={`leading-tight text-center break-words max-w-full px-0.5 rounded ${
          isSelected
            ? "bg-[Highlight] text-[HighlightText]"
            : isXpTheme
            ? "text-white [text-shadow:_1px_1px_1px_rgb(0_0_0_/_90%)]"
            : "text-gray-900 [text-shadow:_0_1px_1px_rgb(255_255_255_/_80%)]"
        }`}
        style={{ 
          fontSize: "var(--os-text-xs)",
          fontFamily: isXpTheme ? '"Pixelated MS Sans Serif", Arial' : undefined,
        }}
      >
        {label}
      </span>
    </div>
  );
}


