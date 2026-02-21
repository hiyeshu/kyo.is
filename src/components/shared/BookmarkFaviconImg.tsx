/**
 * [INPUT]: 依赖 @/stores/useBookmarkStore 的 updateBookmark，依赖 @/stores/useLinkMetaStore 的 LinkMeta 缓存
 * [OUTPUT]: BookmarkFaviconImg 组件
 * [POS]: components/shared 的书签 favicon 渲染器，封装三层回退状态机（primary → linkmeta → emoji），
 *        被 BookmarkIconDisplay / Desktop / Dock / CommandPalette 消费，替代所有裸 <img> 标签
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useCallback } from "react";
import { useBookmarkStore } from "@/stores/useBookmarkStore";
import { useLinkMetaStore } from "@/stores/useLinkMetaStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type FaviconStage = "primary" | "linkmeta" | "emoji";

interface BookmarkFaviconImgProps {
  bookmarkId: string;
  src: string;                 // 主 favicon URL（来自 getBookmarkIconInfo）
  bookmarkUrl: string;         // 用于 LinkMeta 缓存查找
  bookmarkTitle: string;       // 用于首字母 emoji 生成
  faviconResolved?: boolean;   // true 则跳过状态机
  className?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
  loading?: "lazy" | "eager";
}

// ─── 常量 ──────────────────────────────────────────────────────────────────────

// Google S2 假成功检测阈值：16x16 的默认地球图标
const FAKE_SUCCESS_THRESHOLD = 16;

// ─── 组件 ──────────────────────────────────────────────────────────────────────

export function BookmarkFaviconImg({
  bookmarkId,
  src,
  bookmarkUrl,
  bookmarkTitle,
  faviconResolved,
  className = "",
  style,
  draggable = false,
  loading,
}: BookmarkFaviconImgProps) {
  const [stage, setStage] = useState<FaviconStage>("primary");
  const writtenRef = useRef(false);

  // ─── 写回 store（防重复） ──────────────────────────────────────────────────────
  const markResolved = useCallback(() => {
    if (writtenRef.current) return;
    writtenRef.current = true;
    useBookmarkStore.getState().updateBookmark(bookmarkId, { faviconResolved: true });
  }, [bookmarkId]);

  // ─── LinkMeta 缓存查询 ────────────────────────────────────────────────────────
  const getLinkMetaFavicon = useCallback((): string | null => {
    const meta = useLinkMetaStore.getState().get(bookmarkUrl);
    return meta?.faviconUrl || null;
  }, [bookmarkUrl]);

  // ─── 首字母 emoji 生成 ─────────────────────────────────────────────────────────
  const getEmojiChar = useCallback((): string => {
    const ch = bookmarkTitle.trim()[0]?.toUpperCase();
    // 确保是可显示字符（排除空白和控制字符）
    return ch && ch.charCodeAt(0) > 32 ? ch : "🌐";
  }, [bookmarkTitle]);

  // ─── 推进到下一阶段 ──────────────────────────────────────────────────────────
  const advance = useCallback((from: FaviconStage) => {
    if (from === "primary") {
      const lmFavicon = getLinkMetaFavicon();
      if (lmFavicon) {
        setStage("linkmeta");
      } else {
        setStage("emoji");
        markResolved();
      }
    } else if (from === "linkmeta") {
      setStage("emoji");
      markResolved();
    }
  }, [getLinkMetaFavicon, markResolved]);

  // ─── faviconResolved === true → 直接渲染，不走状态机 ──────────────────────────
  if (faviconResolved) {
    return (
      <img
        src={src}
        alt=""
        className={className}
        style={style}
        draggable={draggable}
        loading={loading}
        onError={(e) => {
          // 极端情况：已解析但图片失效，显示 emoji
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          if (target.parentElement) {
            const span = document.createElement("span");
            span.className = target.className;
            Object.assign(span.style, { display: "flex", alignItems: "center", justifyContent: "center" });
            span.textContent = getEmojiChar();
            target.parentElement.appendChild(span);
          }
        }}
      />
    );
  }

  // ─── Emoji 终态 ───────────────────────────────────────────────────────────────
  if (stage === "emoji") {
    return (
      <span
        className={className}
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {getEmojiChar()}
      </span>
    );
  }

  // ─── primary / linkmeta 阶段：渲染 <img> ─────────────────────────────────────
  const imgSrc = stage === "primary" ? src : getLinkMetaFavicon() || src;

  return (
    <img
      src={imgSrc}
      alt=""
      className={className}
      style={style}
      draggable={draggable}
      loading={loading}
      onLoad={(e) => {
        const img = e.target as HTMLImageElement;
        // Google S2 假成功检测：返回 16x16 默认地球图标
        if (stage === "primary" && img.naturalWidth <= FAKE_SUCCESS_THRESHOLD && img.naturalHeight <= FAKE_SUCCESS_THRESHOLD) {
          advance("primary");
          return;
        }
        // 真正加载成功
        markResolved();
      }}
      onError={() => advance(stage)}
    />
  );
}
