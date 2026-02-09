/**
 * [INPUT]: 依赖 @/stores/useBookmarkStore
 * [OUTPUT]: BookmarkIconDisplay 组件
 * [POS]: 根据 Bookmark 渲染图标，使用 getBookmarkIconInfo 单一真相源
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { type Bookmark, getBookmarkIconInfo } from "@/stores/useBookmarkStore";

interface BookmarkIconDisplayProps {
  bookmark: Bookmark;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: "w-5 h-5 text-base",
  md: "w-6 h-6 text-xl",
  lg: "w-8 h-8 text-2xl",
};

export function BookmarkIconDisplay({
  bookmark,
  size = "sm",
  className = "",
}: BookmarkIconDisplayProps) {
  const sizeClass = SIZE_MAP[size];
  
  // 使用单一真相源
  const iconInfo = getBookmarkIconInfo(bookmark);

  // Emoji
  if (iconInfo.isEmoji) {
    return (
      <span className={`${sizeClass} flex items-center justify-center ${className}`}>
        {iconInfo.value}
      </span>
    );
  }

  // Custom (base64) 或 Favicon (URL)
  return (
    <img
      src={iconInfo.value}
      alt=""
      className={`${sizeClass} object-contain ${className}`}
      style={{ imageRendering: "-webkit-optimize-contrast" }}
      draggable={false}
      onError={(e) => {
        // 加载失败显示地球 emoji
        const target = e.target as HTMLImageElement;
        target.style.display = "none";
        if (target.parentElement) {
          const span = document.createElement("span");
          span.className = `${sizeClass} flex items-center justify-center`;
          span.textContent = "🌐";
          target.parentElement.appendChild(span);
        }
      }}
    />
  );
}
