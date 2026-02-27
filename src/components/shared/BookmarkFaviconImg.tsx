/**
 * [INPUT]: 依赖 @/stores/useBookmarkStore 的 updateBookmark，依赖 @/stores/useLinkMetaStore 的 LinkMeta 缓存
 * [OUTPUT]: BookmarkFaviconImg 组件
 * [POS]: components/shared 的书签 favicon 渲染器，封装三层回退状态机（primary → linkmeta → emoji），
 *        加载成功后 canvas 转 128x128 base64 写回 store 实现本地化缓存，
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

// 判断 src 是否已经是本地数据（base64 / 本地路径 / SVG），无需再转换
function isLocalSrc(src: string): boolean {
  return src.startsWith("data:") || src.startsWith("/") || src.startsWith("blob:");
}

// 将 <img> 元素通过 canvas 转为 128x128 PNG base64
// 跨域图片需要 crossOrigin="anonymous"，否则 canvas 被污染无法 toDataURL
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
    // canvas 被污染（CORS 拒绝）或其他异常，静默忽略
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
  const [corsMode, setCorsMode] = useState(true); // true: 带 CORS 尝试转 base64；false: 降级，放弃转换
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
    // 网络图片：canvas 转 128x128 base64 写回
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
      <span
        className={className}
        style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {getEmojiChar()}
      </span>
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
      // corsMode=true: 带 CORS 请求，canvas 可读像素转 base64
      // corsMode=false: 降级，图片能显示但无法转 base64
      crossOrigin={corsMode ? "anonymous" : undefined}
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
        // 真正加载成功 → canvas 转 base64 本地化
        handleLoadSuccess(img);
      }}
      onError={() => {
        // CORS 模式加载失败：可能是服务器不支持 CORS，降级重试（不带 crossOrigin）
        if (corsMode) {
          setCorsMode(false);
          return;
        }
        // 非 CORS 模式也失败：真正的加载失败，推进到下一阶段
        advance(stage);
      }}
    />
  );
}
