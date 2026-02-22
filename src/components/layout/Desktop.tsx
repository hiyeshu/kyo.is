/**
 * [INPUT]: 依赖 apps/base/types 的应用类型，依赖 config/appRegistry 的应用配置，依赖 hooks/useWallpaper 的壁纸管理，依赖 hooks/useLongPress 的长按检测，依赖 stores/useThemeStore 的主题状态，依赖 hooks/useMarqueeSelection 的框选逻辑
 * [OUTPUT]: 对外提供 Desktop 组件，桌面环境核心（壁纸显示、桌面图标、右键菜单、应用启动、框选交互）
 * [POS]: components/layout/ 的桌面组件，被 App.tsx 使用，是桌面环境的主容器
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { AnyApp } from "@/apps/base/types";
import { AppId, getAppIconPath } from "@/config/appRegistry";
import { useState, useRef, useCallback } from "react";
import { useWallpaper } from "@/hooks/useWallpaper";
import { RightClickMenu, MenuItem } from "@/components/ui/right-click-menu";
import { AddWebsiteDialog } from "@/components/dialogs/AddWebsiteDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { useLongPress } from "@/hooks/useLongPress";
import { useThemeStore } from "@/stores/useThemeStore";
import { useBookmarkStore, openBookmarkUrl, getBookmarkIconInfo, type Bookmark } from "@/stores/useBookmarkStore";
import { BookmarkFaviconImg } from "@/components/shared/BookmarkFaviconImg";
import { useStickiesStore } from "@/stores/useStickiesStore";
import type { LaunchOriginRect } from "@/stores/useAppStore";
import { useEventListener } from "@/hooks/useEventListener";
import { useMarqueeSelection } from "@/hooks/useMarqueeSelection";
import { getTranslatedAppName } from "@/utils/i18n";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/useIsMobile";
import { handleUrlPaste } from "@/hooks/usePasteHandler";

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
  const desktopRef = useRef<HTMLDivElement>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [contextMenuAppId, setContextMenuAppId] = useState<string | null>(null);
  const [isAddWebsiteDialogOpen, setIsAddWebsiteDialogOpen] = useState(false);
  const [isBatchRemoveDialogOpen, setIsBatchRemoveDialogOpen] = useState(false);
  const [batchRemoveIds, setBatchRemoveIds] = useState<Set<string>>(new Set());

  const currentTheme = useThemeStore((state) => state.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  const isTauriApp =
    typeof window !== "undefined" && "__TAURI__" in window;
  const isMobile = useIsMobile();

  // ─── Bookmarks for desktop (all themes) ────────────────────────────
  const bookmarkStore = useBookmarkStore();
  const [contextMenuBookmark, setContextMenuBookmark] = useState<Bookmark | null>(null);

  // ─── Marquee selection ─────────────────────────────────────────────
  const {
    marqueeRect,
    selectedIds: selectedBookmarkIds,
    clearSelection,
    selectAll,
    setSelectedIds: setSelectedBookmarkIds,
    handleMouseDown: handleMarqueeMouseDown,
    justFinishedRef,
  } = useMarqueeSelection({
    containerRef: desktopRef,
    enabled: !isMobile,
  });

  const handleDesktopClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (e.shiftKey) {
        onClick?.();
        return;
      }
      if (target.closest("[data-desktop-icon]")) return;
      // 框选刚结束时跳过 click
      if (justFinishedRef.current) return;
      setSelectedAppId(null);
      clearSelection();
      onClick?.();
    },
    [onClick, clearSelection, justFinishedRef]
  );

  const desktopBookmarks = bookmarkStore.items.filter((b) => b.onDesktop) as Bookmark[];

  // ─── Keyboard shortcuts ─────────────────────────────────────────────
  useEventListener("keydown", useCallback((e: KeyboardEvent) => {
    // ⌘A / Ctrl+A → 全选桌面书签
    if ((e.metaKey || e.ctrlKey) && e.key === "a") {
      e.preventDefault();
      selectAll(desktopBookmarks.map((bm) => bm.id));
      return;
    }
    // Delete / Backspace → 批量移除（非 input/textarea 焦点时）
    if (e.key === "Delete" || e.key === "Backspace") {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (selectedBookmarkIds.size > 0) {
        e.preventDefault();
        setBatchRemoveIds(new Set(selectedBookmarkIds));
        setIsBatchRemoveDialogOpen(true);
      }
    }
  }, [desktopBookmarks, selectedBookmarkIds, selectAll]));

  // ─── Batch remove handler ───────────────────────────────────────────
  const handleBatchRemove = useCallback(() => {
    batchRemoveIds.forEach((id) => {
      bookmarkStore.updateBookmark(id, { onDesktop: false });
    });
    clearSelection();
    setIsBatchRemoveDialogOpen(false);
  }, [batchRemoveIds, bookmarkStore, clearSelection]);

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
  const displayedApps: AnyApp[] = _apps.filter((app) => app.id === "bookmarks");

  // ─── Context menu ─────────────────────────────────────────────────
  const getContextMenuItems = (): MenuItem[] => {
    // Bookmark context menu (multi-select aware)
    if (contextMenuBookmark) {
      const isMulti = selectedBookmarkIds.size > 1 && selectedBookmarkIds.has(contextMenuBookmark.id);
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
          label: isMulti
            ? t("common.desktop.removeSelectedFromDesktop", "从桌面移除 ({{count}})", { count: selectedBookmarkIds.size })
            : t("common.desktop.removeFromDesktop", "从桌面移除"),
          onSelect: () => {
            if (isMulti) {
              setBatchRemoveIds(new Set(selectedBookmarkIds));
              setIsBatchRemoveDialogOpen(true);
            } else {
              bookmarkStore.updateBookmark(contextMenuBookmark.id, { onDesktop: false });
            }
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
            const url = text?.trim();
            if (url && /^https?:\/\/\S+$/i.test(url)) {
              handleUrlPaste(url, (key, fallback) => t(key, fallback || ""));
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
      ref={desktopRef}
      className="absolute inset-0 min-h-screen h-full z-0 desktop-background"
      onClick={handleDesktopClick}
      onMouseDown={handleMarqueeMouseDown}
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
      onDragOver={(e) => {
        // 允许从我的收藏拖书签到桌面
        if (e.dataTransfer.types.includes("application/json")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(e) => {
        try {
          const raw = e.dataTransfer.getData("application/json");
          if (!raw) return;
          const data = JSON.parse(raw);
          if (data.type === "bookmark" && data.bookmarkId) {
            e.preventDefault();
            bookmarkStore.updateBookmark(data.bookmarkId, { onDesktop: true });
          }
        } catch { /* noop */ }
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
            <div
              key={app.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData(
                  "application/json",
                  JSON.stringify({
                    type: "app",
                    appId: app.id,
                    name: getTranslatedAppName(app.id as AppId),
                  })
                );
                // Set drag image
                const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
                dragImage.style.position = "absolute";
                dragImage.style.top = "-1000px";
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                setTimeout(() => document.body.removeChild(dragImage), 0);
              }}
            >
              <DesktopIcon
                label={getTranslatedAppName(app.id as AppId)}
                icon={getAppIconPath(app.id as AppId, currentTheme)}
                isSelected={selectedAppId === app.id}
                theme={currentTheme}
                onClick={(e) => {
                  e.stopPropagation();
                  // Mobile: single tap opens app; Desktop: single click selects
                  if (isMobile) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    toggleApp(app.id as AppId, undefined, {
                      x: rect.left,
                      y: rect.top,
                      width: rect.width,
                      height: rect.height,
                    });
                    setSelectedAppId(null);
                  } else {
                    setSelectedAppId(app.id);
                    clearSelection();
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  // Desktop: double click opens app
                  if (!isMobile) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    toggleApp(app.id as AppId, undefined, {
                      x: rect.left,
                      y: rect.top,
                      width: rect.width,
                      height: rect.height,
                    });
                    setSelectedAppId(null);
                  }
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
            </div>
          ))}
          
          {/* Bookmark icons (all themes, those marked onDesktop=true) */}
          {desktopBookmarks.map((bm) => (
            <BookmarkIconWrapper
              key={bm.id}
              bookmark={bm}
              isMobile={isMobile}
              isSelected={selectedBookmarkIds.has(bm.id)}
              theme={currentTheme}
              onOpen={() => {
                openBookmarkUrl(bm.url);
                clearSelection();
              }}
              onSelect={() => {
                setSelectedBookmarkIds(new Set([bm.id]));
                setSelectedAppId(null);
              }}
              onContextMenu={(x, y) => {
                setContextMenuPos({ x, y });
                setContextMenuBookmark(bm);
                setContextMenuAppId(null);
                if (!selectedBookmarkIds.has(bm.id)) {
                  setSelectedBookmarkIds(new Set([bm.id]));
                }
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
      <ConfirmDialog
        isOpen={isBatchRemoveDialogOpen}
        onOpenChange={setIsBatchRemoveDialogOpen}
        onConfirm={handleBatchRemove}
        title={t("common.desktop.batchRemoveTitle", "移除书签")}
        description={t("common.desktop.batchRemoveDesc", "确定要将选中的 {{count}} 个书签从桌面移除吗？", { count: batchRemoveIds.size })}
      />

      {/* Marquee selection overlay */}
      {marqueeRect && (
        <div
          className="fixed pointer-events-none z-50 border border-white/60 bg-white/15"
          style={{
            left: marqueeRect.left,
            top: marqueeRect.top,
            width: marqueeRect.width,
            height: marqueeRect.height,
          }}
        />
      )}
    </div>
  );
}

// ─── Desktop icon constants ───────────────────────────────────────────
// Aqua 水晶高光渐变 —— 与 BookmarkIconDisplay 统一
const AQUA_HIGHLIGHT =
  "linear-gradient(to bottom, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 50%, transparent 50%, rgba(0,0,0,0.03) 100%)";

// Text shadow (matches ryos FileIcon)
// macOS: rgba(0,0,0,0.9) 0px 1px 0px, rgba(0,0,0,0.85) 0px 1px 3px, rgba(0,0,0,0.45) 0px 2px 3px
// XP: 1px 1px 2px rgba(0,0,0,0.8)
const MACOS_TEXT_SHADOW = "rgba(0, 0, 0, 0.9) 0px 1px 0px, rgba(0, 0, 0, 0.85) 0px 1px 3px, rgba(0, 0, 0, 0.45) 0px 2px 3px";
const XP_TEXT_SHADOW = "1px 1px 2px rgba(0, 0, 0, 0.8)";

// ─── Bookmark icon wrapper (long-press → context menu on iOS) ────────

function BookmarkIconWrapper({
  bookmark,
  isMobile,
  isSelected,
  theme,
  onOpen,
  onSelect,
  onContextMenu,
}: {
  bookmark: Bookmark;
  isMobile: boolean;
  isSelected: boolean;
  theme: string;
  onOpen: () => void;
  onSelect: () => void;
  onContextMenu: (x: number, y: number) => void;
}) {
  const longPressTimer = useRef<number | null>(null);
  const didLongPress = useRef(false);

  const clearTimer = useCallback(() => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <div
      data-bookmark-id={bookmark.id}
      draggable={!isMobile}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData(
          "application/json",
          JSON.stringify({ type: "bookmark", bookmarkId: bookmark.id })
        );
        const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
        dragImage.style.position = "absolute";
        dragImage.style.top = "-1000px";
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        setTimeout(() => document.body.removeChild(dragImage), 0);
      }}
      // 长按触发右键菜单（iOS 触屏）
      onTouchStart={(e) => {
        if (e.touches.length !== 1) return;
        didLongPress.current = false;
        const touch = e.touches[0];
        const x = touch.clientX;
        const y = touch.clientY;
        longPressTimer.current = window.setTimeout(() => {
          didLongPress.current = true;
          onContextMenu(x, y);
        }, 500);
      }}
      onTouchEnd={(e) => {
        clearTimer();
        // 长按后松手不触发 click（防止打开链接）
        if (didLongPress.current) {
          e.preventDefault();
          didLongPress.current = false;
        }
      }}
      onTouchMove={clearTimer}
      onTouchCancel={clearTimer}
    >
      <BookmarkDesktopIcon
        bookmark={bookmark}
        isSelected={isSelected}
        theme={theme}
        onClick={(e) => {
          e.stopPropagation();
          if (isMobile) {
            onOpen();
          } else {
            onSelect();
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!isMobile) onOpen();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e.clientX, e.clientY);
        }}
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
  const isMacTheme = theme === "macosx";
  const isXpTheme = theme === "xp";
  const isWin98Theme = theme === "win98";
  
  // 使用单一真相源获取图标信息
  const iconInfo = getBookmarkIconInfo(bookmark);

  return (
    <div
      data-desktop-icon="true"
      className={`flex flex-col items-center justify-start cursor-default select-none ${
        isMacTheme ? "gap-0 pb-3" : "gap-0"
      }`}
      style={{ width: "96px" }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {/* Icon container - 64x64 */}
      <div 
        className={`flex items-center justify-center w-16 h-16 ${
          isSelected ? "brightness-[0.65]" : ""
        }`}
      >
        {iconInfo.isEmoji ? (
          // Emoji 图标
          <span 
            className="flex items-center justify-center leading-none"
            style={{ fontSize: 48 }}
          >
            {iconInfo.value}
          </span>
        ) : isMacTheme ? (
          // macOS Aqua: iOS 风格圆角 + 白底 + 水晶高光
          <div
            className="relative overflow-hidden w-12 h-12"
            style={{
              borderRadius: "22%",
              backgroundColor: "#ffffff",
              boxShadow: "0 1px 0 rgba(0,0,0,0.25), 0 2px 3px rgba(0,0,0,0.12)",
            }}
          >
            <BookmarkFaviconImg
              bookmarkId={bookmark.id}
              src={iconInfo.value}
              bookmarkUrl={bookmark.url}
              bookmarkTitle={bookmark.title}
              faviconResolved={bookmark.faviconResolved}
              className="w-full h-full object-cover"
              style={{ imageRendering: "-webkit-optimize-contrast" }}
              loading="lazy"
            />
            {/* Aqua 水晶高光 */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                borderRadius: "22%",
                background: AQUA_HIGHLIGHT,
              }}
            />
          </div>
        ) : (
          // XP/Win98: 直接显示图标
          <BookmarkFaviconImg
            bookmarkId={bookmark.id}
            src={iconInfo.value}
            bookmarkUrl={bookmark.url}
            bookmarkTitle={bookmark.title}
            faviconResolved={bookmark.faviconResolved}
            className="w-12 h-12 object-contain"
            style={{ imageRendering: "auto" }}
            loading="lazy"
          />
        )}
      </div>
      
      {/* Label */}
      <span
        className={`px-1 text-center truncate text-xs max-w-[96px] ${
          isMacTheme ? "rounded font-bold" : ""
        } ${
          isSelected ? "" : isWin98Theme ? "bg-white text-black" : "bg-transparent text-white"
        }`}
        style={{
          ...(isSelected
            ? {
                background: "var(--os-color-selection-bg)",
                color: "var(--os-color-selection-text)",
              }
            : {}),
          ...(!isSelected && (isXpTheme || isMacTheme)
            ? { textShadow: isMacTheme ? MACOS_TEXT_SHADOW : XP_TEXT_SHADOW }
            : {}),
          fontFamily: (isXpTheme || isWin98Theme) ? '"Pixelated MS Sans Serif", Arial' : undefined,
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
  const isMacTheme = theme === "macosx";
  const isXpTheme = theme === "xp";
  const isWin98Theme = theme === "win98";
  
  return (
    <div
      data-desktop-icon="true"
      className={`flex flex-col items-center justify-start cursor-default select-none ${
        isMacTheme ? "gap-0 pb-3" : "gap-0"
      }`}
      style={{ width: "96px" }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {/* Icon container - 64x64 */}
      <div 
        className={`flex items-center justify-center w-16 h-16 ${
          isSelected ? "brightness-[0.65]" : ""
        }`}
      >
        <img
          src={icon}
          alt={label}
          className="w-12 h-12 object-contain pointer-events-none"
          style={{ imageRendering: "auto" }}
          draggable={false}
        />
      </div>
      <span
        className={`px-1 text-center truncate text-xs max-w-[96px] ${
          isMacTheme ? "rounded font-bold" : ""
        } ${
          isSelected ? "" : isWin98Theme ? "bg-white text-black" : "bg-transparent text-white"
        }`}
        style={{
          ...(isSelected
            ? {
                background: "var(--os-color-selection-bg)",
                color: "var(--os-color-selection-text)",
              }
            : {}),
          ...(!isSelected && (isXpTheme || isMacTheme)
            ? { textShadow: isMacTheme ? MACOS_TEXT_SHADOW : XP_TEXT_SHADOW }
            : {}),
          fontFamily: (isXpTheme || isWin98Theme) ? '"Pixelated MS Sans Serif", Arial' : undefined,
        }}
      >
        {label}
      </span>
    </div>
  );
}
