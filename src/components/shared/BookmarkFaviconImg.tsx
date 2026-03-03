/**
 * [INPUT]: 依赖 @/stores/useBookmarkStore 的 updateBookmark，依赖 @/stores/useLinkMetaStore 的 LinkMeta 缓存
 * [OUTPUT]: BookmarkFaviconImg 组件
 * [POS]: components/shared 的书签 favicon 渲染器，封装三层回退状态机（primary → linkmeta → emoji），
 *        加载成功后尝试 canvas 转 128x128 base64 写回 store（同源图片本地化，跨域静默跳过），
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

// 本地化缓存分辨率：128x128 覆盖桌面/书签板/CommandPalette，Dock 放大态可接受
const CACHE_SIZE = 128;

// ─── 工具函数 ──────────────────────────────────────────────────────────────────

// 预设色板 — 手工挑选 12 色，覆盖色相环，饱和明亮，白色字母清晰可读
const AVATAR_COLORS = [
  "#E06C75", // 珊瑚红
  "#E5A05B", // 琥珀橙
  "#D4B84E", // 金黄
  "#7EC699", // 薄荷绿
  "#56B6C2", // 青蓝
  "#5B9FE4", // 天蓝
  "#6C8DD5", // 钴蓝
  "#9B7FCA", // 薰衣草紫
  "#C678DD", // 亮紫
  "#E06CA5", // 玫粉
  "#7DAF6E", // 草绿
  "#5AAFBE", // 湖蓝
];

// 字符串哈希 → 从预设色板取色
function titleToColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// 字母回退的通用样式：彩色背景 + 白色粗体字母 + 填满容器
function emojiStyle(title: string, baseStyle?: React.CSSProperties): React.CSSProperties {
  return {
    ...baseStyle,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: titleToColor(title),
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "1.25rem",
    borderRadius: "inherit",
  };
}

// 判断 src 是否已经是本地数据（base64 / 本地路径），无需再转换
function isLocalSrc(src: string): boolean {
  return src.startsWith("data:") || src.startsWith("/") || src.startsWith("blob:");
}

// 将 <img> 元素通过 canvas 转为 128x128 PNG base64
// 跨域图片 canvas 会被污染，toDataURL 抛 SecurityError，被 catch 静默吞掉
function imgToBase64(img: HTMLImageElement): string | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = CACHE_SIZE;
    canvas.height = CACHE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, CACHE_SIZE, CACHE_SIZE);
    return canvas.toDataURL("image/png");
  } catch {
    // canvas 被污染（跨域图片）或其他异常，静默忽略
    return null;
  }
}

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
  const [resolvedBroken, setResolvedBroken] = useState(false);
  const writtenRef = useRef(false);

  // ─── 写回 store（防重复） ──────────────────────────────────────────────────────
  const markResolved = useCallback((base64?: string) => {
    if (writtenRef.current) return;
    writtenRef.current = true;
    const updates: Record<string, unknown> = { faviconResolved: true };
    // 有 base64 则同时写回 favicon，实现本地化
    if (base64) updates.favicon = base64;
    useBookmarkStore.getState().updateBookmark(bookmarkId, updates);
  }, [bookmarkId]);

  // ─── 加载成功：尝试 canvas 转 base64 并写回 ────────────────────────────────────
  const handleLoadSuccess = useCallback((img: HTMLImageElement) => {
    // 已经是本地数据，不需要转换，直接标记完成
    if (isLocalSrc(img.src)) {
      markResolved();
      return;
    }
    // 尝试 canvas 转 base64：同源图片能成功，跨域图片会被 catch 静默跳过
    const base64 = imgToBase64(img);
    markResolved(base64 || undefined);
  }, [markResolved]);

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
  if (faviconResolved && !resolvedBroken) {
    return (
      <img
        src={src}
        alt=""
        className={className}
        style={style}
        draggable={draggable}
        loading={loading}
        onError={() => setResolvedBroken(true)}
      />
    );
  }

  if (resolvedBroken) {
    return (
      <span className={className} style={emojiStyle(bookmarkTitle, style)}>
        {getEmojiChar()}
      </span>
    );
  }

  // ─── Emoji 终态 ───────────────────────────────────────────────────────────────
  if (stage === "emoji") {
    return (
      <span className={className} style={emojiStyle(bookmarkTitle, style)}>
        {getEmojiChar()}
      </span>
    );
  }

  // ─── primary / linkmeta 阶段：渲染 <img> ─────────────────────────────────────
  const imgSrc = stage === "primary" ? src : getLinkMetaFavicon() || src;

  const needCors = !isLocalSrc(imgSrc);

  return (
    <img
      src={imgSrc}
      alt=""
      className={className}
      style={style}
      draggable={draggable}
      loading={loading}
      crossOrigin={needCors ? "anonymous" : undefined}
      onLoad={(e) => {
        const img = e.target as HTMLImageElement;
        if (stage === "primary" && img.naturalWidth <= FAKE_SUCCESS_THRESHOLD && img.naturalHeight <= FAKE_SUCCESS_THRESHOLD) {
          advance("primary");
          return;
        }
        handleLoadSuccess(img);
      }}
      onError={() => advance(stage)}
    />
  );
}
