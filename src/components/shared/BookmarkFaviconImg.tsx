/**
 * [INPUT]: 无外部 store 依赖
 * [OUTPUT]: BookmarkFaviconImg 组件
 * [POS]: components/shared 的书签 favicon 渲染器，<img> + onError 首字母彩色头像，
 *        被 BookmarkIconDisplay / Desktop / Dock / CommandPalette 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookmarkFaviconImgProps {
  bookmarkId?: string;
  src: string;
  bookmarkUrl?: string;
  bookmarkTitle: string;
  faviconResolved?: boolean;
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
  bookmarkTitle,
  className = "",
  style,
  draggable = false,
  loading,
}: BookmarkFaviconImgProps) {
  const [broken, setBroken] = useState(false);

  if (broken || !src) {
    return <LetterAvatar title={bookmarkTitle} className={className} style={style} />;
  }

  return (
    <img
      src={src}
      alt=""
      className={className}
      style={style}
      draggable={draggable}
      loading={loading}
      onError={() => setBroken(true)}
    />
  );
}
