/**
 * [INPUT]: 依赖 @/stores/useLinkMetaStore 本地缓存，依赖 @/lib/linkMeta 异步获取
 * [OUTPUT]: BookmarkFaviconImg 组件
 * [POS]: components/shared 的书签 favicon 渲染器，双层回退（Icon Horse → LinkMeta favicon → 首字母头像），
 *        被 BookmarkIconDisplay / Desktop / Dock / CommandPalette 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useLinkMetaStore } from "@/stores/useLinkMetaStore";
import { fetchLinkMeta } from "@/lib/linkMeta";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookmarkFaviconImgProps {
  bookmarkId?: string;
  src: string;
  bookmarkUrl?: string;
  bookmarkTitle: string;
  className?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
  loading?: "lazy" | "eager";
}

// ─── 首字母彩色头像 ──────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#E06C75", "#E5A05B", "#D4B84E", "#7EC699", "#56B6C2", "#5B9FE4",
  "#6C8DD5", "#9B7FCA", "#C678DD", "#E06CA5", "#7DAF6E", "#5AAFBE",
];

function titleToColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function LetterAvatar({ title, className, style }: { title: string; className?: string; style?: React.CSSProperties }) {
  const ch = title.trim()[0]?.toUpperCase();
  const letter = ch && ch.charCodeAt(0) > 32 ? ch : "🌐";
  return (
    <span
      className={className}
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: titleToColor(title),
        color: "#ffffff",
        fontWeight: 700,
        fontSize: "1.25rem",
        borderRadius: "inherit",
      }}
    >
      {letter}
    </span>
  );
}

// ─── 组件 ──────────────────────────────────────────────────────────────────────

export function BookmarkFaviconImg({
  src,
  bookmarkUrl,
  bookmarkTitle,
  className = "",
  style,
  draggable = false,
  loading,
}: BookmarkFaviconImgProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [showAvatar, setShowAvatar] = useState(false);
  const retriedRef = useRef(false);

  useEffect(() => {
    setImgSrc(src);
    setShowAvatar(false);
    retriedRef.current = false;
  }, [src]);

  const handleError = useCallback(() => {
    if (retriedRef.current) {
      setShowAvatar(true);
      return;
    }
    retriedRef.current = true;

    if (!bookmarkUrl) {
      setShowAvatar(true);
      return;
    }

    // 同步：检查 LinkMeta 本地缓存
    const cached = useLinkMetaStore.getState().get(bookmarkUrl);
    if (cached?.faviconUrl && cached.faviconUrl !== src) {
      setImgSrc(cached.faviconUrl);
      return;
    }

    // 异步：先显示头像，后台 fetch + 预加载，成功后无闪切换
    setShowAvatar(true);
    fetchLinkMeta(bookmarkUrl)
      .then((meta) => {
        if (!meta.faviconUrl || meta.faviconUrl === src) return;
        const probe = new Image();
        probe.onload = () => {
          setImgSrc(meta.faviconUrl!);
          setShowAvatar(false);
        };
        probe.src = meta.faviconUrl;
      })
      .catch(() => {});
  }, [bookmarkUrl, src]);

  if (showAvatar || !src) {
    return <LetterAvatar title={bookmarkTitle} className={className} style={style} />;
  }

  return (
    <img
      src={imgSrc}
      alt=""
      className={className}
      style={style}
      draggable={draggable}
      loading={loading}
      onError={handleError}
    />
  );
}
