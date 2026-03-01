/**
 * [INPUT]: 依赖 stores/useBookmarkStore 的 Bookmark 类型和 getBookmarkIconInfo，依赖 components/shared/BookmarkFaviconImg
 * [OUTPUT]: 对外提供 DesktopIcon(memo)、BookmarkDesktopIcon(memo)、BookmarkIconWrapper(memo) 组件，以及图标常量
 * [POS]: components/layout/ 的桌面图标组件集，被 Desktop.tsx 和 MobileDesktopGrid.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { memo, useRef, useCallback } from "react";
import { getBookmarkIconInfo, type Bookmark } from "@/stores/useBookmarkStore";
import { BookmarkFaviconImg } from "@/components/shared/BookmarkFaviconImg";

// ─── 桌面图标常量 ─────────────────────────────────────────────────────
// Aqua 水晶高光渐变 —— 与 BookmarkIconDisplay 统一
export const AQUA_HIGHLIGHT =
  "linear-gradient(to bottom, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 50%, transparent 50%, rgba(0,0,0,0.03) 100%)";

// 文字阴影（与 FileIcon 一致）
export const MACOS_TEXT_SHADOW =
  "rgba(0, 0, 0, 0.9) 0px 1px 0px, rgba(0, 0, 0, 0.85) 0px 1px 3px, rgba(0, 0, 0, 0.45) 0px 2px 3px";
export const XP_TEXT_SHADOW = "1px 1px 2px rgba(0, 0, 0, 0.8)";

// ─── 主题判断工具 ─────────────────────────────────────────────────────
function useThemeFlags(theme: string) {
  return {
    isMacTheme: theme === "macosx",
    isXpTheme: theme === "xp",
    isWin98Theme: theme === "win98",
  };
}

// ─── 图标标签样式（消除 DesktopIcon / BookmarkDesktopIcon 重复） ──────
const IconLabel = memo(function IconLabel({
  text,
  isSelected,
  theme,
}: {
  text: string;
  isSelected: boolean;
  theme: string;
}) {
  const { isMacTheme, isXpTheme, isWin98Theme } = useThemeFlags(theme);
  return (
    <span
      className={`px-1 text-center truncate text-xs max-w-[96px] ${
        isMacTheme ? "rounded font-bold" : ""
      } ${
        isSelected
          ? ""
          : isWin98Theme
            ? "bg-white text-black"
            : "bg-transparent text-white"
      }`}
      style={{
        ...(isSelected
          ? {
              background: "var(--os-color-selection-bg)",
              color: "var(--os-color-selection-text)",
            }
          : {}),
        ...(!isSelected && (isXpTheme || isMacTheme)
          ? {
              textShadow: isMacTheme ? MACOS_TEXT_SHADOW : XP_TEXT_SHADOW,
            }
          : {}),
        fontFamily:
          isXpTheme || isWin98Theme
            ? '"Pixelated MS Sans Serif", Arial'
            : undefined,
      }}
    >
      {text}
    </span>
  );
});

// ─── 应用桌面图标 ─────────────────────────────────────────────────────

export const DesktopIcon = memo(function DesktopIcon({
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
  const { isMacTheme } = useThemeFlags(theme);

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
      <IconLabel text={label} isSelected={isSelected} theme={theme} />
    </div>
  );
});

// ─── 书签桌面图标 ─────────────────────────────────────────────────────

export const BookmarkDesktopIcon = memo(function BookmarkDesktopIcon({
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
  const { isMacTheme } = useThemeFlags(theme);
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
      <div
        className={`flex items-center justify-center w-16 h-16 ${
          isSelected ? "brightness-[0.65]" : ""
        }`}
      >
        {iconInfo.isEmoji ? (
          <span
            className="flex items-center justify-center leading-none"
            style={{ fontSize: 48 }}
          >
            {iconInfo.value}
          </span>
        ) : (
          <div
            className="relative overflow-hidden w-12 h-12"
            style={{
              borderRadius: "22%",
              backgroundColor: "#ffffff",
              boxShadow:
                "0 1px 0 rgba(0,0,0,0.25), 0 2px 3px rgba(0,0,0,0.12)",
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
            {isMacTheme && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ borderRadius: "22%", background: AQUA_HIGHLIGHT }}
              />
            )}
          </div>
        )}
      </div>
      <IconLabel
        text={bookmark.title}
        isSelected={isSelected}
        theme={theme}
      />
    </div>
  );
});

// ─── 书签图标包装器（长按 → 右键菜单） ────────────────────────────────

export const BookmarkIconWrapper = memo(function BookmarkIconWrapper({
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
        e.dataTransfer.setDragImage(
          dragImage,
          e.nativeEvent.offsetX,
          e.nativeEvent.offsetY
        );
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
});
