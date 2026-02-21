/**
 * [INPUT]: 依赖 @/stores/useBookmarkStore (getBookmarkIconInfo), useThemeStore, BookmarkFaviconImg
 * [OUTPUT]: BookmarkIconDisplay 组件
 * [POS]: 书签图标渲染组件，size="sm" 填满父容器（样式由父控制），其他尺寸独立渲染
 *        md/lg/xl 自带 iOS 风格圆角 + Aqua 水晶高光，和 Dock/书签板统一
 *        favicon 类型图标统一走 BookmarkFaviconImg 三层回退
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { type Bookmark, getBookmarkIconInfo } from "@/stores/useBookmarkStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { BookmarkFaviconImg } from "@/components/shared/BookmarkFaviconImg";

interface BookmarkIconDisplayProps {
  bookmark: Bookmark;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

// 尺寸映射
const SIZE_MAP = {
  sm: { width: "100%", height: "100%", fontSize: "1.5rem" },   // 填满父容器
  md: { width: "36px", height: "36px", fontSize: "1.5rem" },   // 36px
  lg: { width: "48px", height: "48px", fontSize: "2rem" },     // 48px
  xl: { width: "64px", height: "64px", fontSize: "2.5rem" },   // 64px
};

// Aqua 水晶高光渐变 —— Dock / 书签板 / 预览共用
const AQUA_HIGHLIGHT =
  "linear-gradient(to bottom, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 50%, transparent 50%, rgba(0,0,0,0.03) 100%)";

/**
 * 书签图标显示组件
 * 
 * size="sm": 填满父容器，不加额外样式（由父容器控制样式）
 * size="md/lg/xl": 独立渲染，iOS 风格圆角 + 白底 + 阴影 + Aqua 高光
 */
export function BookmarkIconDisplay({
  bookmark,
  size = "sm",
  className = "",
}: BookmarkIconDisplayProps) {
  const sizeStyle = SIZE_MAP[size];
  const iconInfo = getBookmarkIconInfo(bookmark);
  const isMacTheme = useThemeStore((s) => s.current) === "macosx";
  
  // size="sm" 时填满父容器，不加任何容器样式
  const isEmbedded = size === "sm";

  // Emoji 图标
  if (iconInfo.isEmoji) {
    return (
      <span 
        className={`flex items-center justify-center ${className}`}
        style={{ 
          width: sizeStyle.width, 
          height: sizeStyle.height,
          fontSize: sizeStyle.fontSize,
        }}
      >
        {iconInfo.value}
      </span>
    );
  }

  // size="sm": 填满父容器，由父容器控制圆角/背景/阴影
  if (isEmbedded) {
    return (
      <BookmarkFaviconImg
        bookmarkId={bookmark.id}
        src={iconInfo.value}
        bookmarkUrl={bookmark.url}
        bookmarkTitle={bookmark.title}
        faviconResolved={bookmark.faviconResolved}
        className={`w-full h-full object-cover ${className}`}
        style={{ imageRendering: "-webkit-optimize-contrast" }}
      />
    );
  }

  // size="md/lg/xl": iOS 风格圆角容器 + Aqua 水晶高光（和 Dock / 书签板统一）
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        width: sizeStyle.width,
        height: sizeStyle.height,
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
      />
      {/* Aqua 水晶高光 */}
      {isMacTheme && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: "22%",
            background: AQUA_HIGHLIGHT,
          }}
        />
      )}
    </div>
  );
}
