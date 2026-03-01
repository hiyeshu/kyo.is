/**
 * [INPUT]: 依赖 react 的 useState/useEffect/useRef/useMemo，依赖 react-dom 的 createPortal，依赖 utils/platform 的 getApiUrl
 * [OUTPUT]: 对外提供 BookmarkHoverCard 组件
 * [POS]: components/layout/ 的书签悬浮信息卡，被 DesktopIcons.tsx / Desktop.tsx / BookmarkBoardApp.tsx 消费，负责截图预览缓存与降级显示
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useRef, useLayoutEffect, useState, memo, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { getApiUrl } from "@/utils/platform";

// ─── 截图缓存（URL 级）─────────────────────────────────────────────────────

const PREVIEW_CACHE_KEY = "kyo:bookmark-hover-preview-cache:v1";
const PREVIEW_SUCCESS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天
const PREVIEW_FAIL_BASE_RETRY_MS = 60 * 60 * 1000; // 1 小时
const PREVIEW_FAIL_MAX_RETRY_MS = 24 * 60 * 60 * 1000; // 24 小时
const PREVIEW_PROBE_TIMEOUT_MS = 8000;

type PreviewStatus = "success" | "failed";

interface PreviewCacheEntry {
  status: PreviewStatus;
  previewUrl: string | null;
  expiresAt: number;
  failCount: number;
  nextRetryAt: number;
}

const previewMemoryCache = new Map<string, PreviewCacheEntry>();
const previewInFlight = new Map<string, Promise<PreviewCacheEntry>>();

function normalizeBookmarkUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const full = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(full).toString();
  } catch {
    return null;
  }
}

function buildScreenshotUrl(normalizedUrl: string): string {
  const params = new URLSearchParams({
    url: normalizedUrl,
    width: "800",
    height: "500",
    format: "webp",
    quality: "70",
    block_ads: "true",
    timeout: "15000",
  });
  return getApiUrl(`/api/bookmark-preview?${params.toString()}`);
}

function readPreviewStorage(): Record<string, PreviewCacheEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PREVIEW_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, PreviewCacheEntry>;
  } catch {
    return {};
  }
}

function writePreviewStorage(next: Record<string, PreviewCacheEntry>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREVIEW_CACHE_KEY, JSON.stringify(next));
  } catch {
    // 忽略存储失败，不影响 UI 正常显示
  }
}

function upsertPreviewCache(url: string, entry: PreviewCacheEntry) {
  previewMemoryCache.set(url, entry);
  const storage = readPreviewStorage();
  storage[url] = entry;
  writePreviewStorage(storage);
}

function getCachedPreview(url: string): PreviewCacheEntry | null {
  const now = Date.now();
  const fromMemory = previewMemoryCache.get(url);
  if (fromMemory) {
    const isValidSuccess = fromMemory.status === "success" && fromMemory.expiresAt > now;
    const isCoolingDownFail = fromMemory.status === "failed" && fromMemory.nextRetryAt > now;
    if (isValidSuccess || isCoolingDownFail) return fromMemory;
  }

  const fromStorage = readPreviewStorage()[url];
  if (!fromStorage) return null;
  const isValidSuccess = fromStorage.status === "success" && fromStorage.expiresAt > now;
  const isCoolingDownFail = fromStorage.status === "failed" && fromStorage.nextRetryAt > now;
  if (isValidSuccess || isCoolingDownFail) {
    previewMemoryCache.set(url, fromStorage);
    return fromStorage;
  }
  return null;
}

function probeImageLoad(previewUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const timeout = window.setTimeout(() => {
      if (done) return;
      done = true;
      resolve(false);
    }, PREVIEW_PROBE_TIMEOUT_MS);

    img.onload = () => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      resolve(true);
    };

    img.onerror = () => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      resolve(false);
    };

    img.referrerPolicy = "no-referrer";
    img.src = previewUrl;
  });
}

async function loadPreview(url: string): Promise<PreviewCacheEntry> {
  const cached = getCachedPreview(url);
  if (cached) return cached;

  const inFlight = previewInFlight.get(url);
  if (inFlight) return inFlight;

  const request = (async () => {
    const now = Date.now();
    const prev = previewMemoryCache.get(url) ?? readPreviewStorage()[url];
    const failCount = prev?.status === "failed" ? prev.failCount : 0;

    const previewUrl = buildScreenshotUrl(url);
    const ok = await probeImageLoad(previewUrl);

    if (ok) {
      const successEntry: PreviewCacheEntry = {
        status: "success",
        previewUrl,
        expiresAt: now + PREVIEW_SUCCESS_TTL_MS,
        failCount: 0,
        nextRetryAt: 0,
      };
      upsertPreviewCache(url, successEntry);
      return successEntry;
    }

    const nextFailCount = failCount + 1;
    const retryDelay = Math.min(
      PREVIEW_FAIL_BASE_RETRY_MS * 2 ** Math.max(0, nextFailCount - 1),
      PREVIEW_FAIL_MAX_RETRY_MS
    );
    const failedEntry: PreviewCacheEntry = {
      status: "failed",
      previewUrl: null,
      expiresAt: now + retryDelay,
      failCount: nextFailCount,
      nextRetryAt: now + retryDelay,
    };
    upsertPreviewCache(url, failedEntry);
    return failedEntry;
  })().finally(() => {
    previewInFlight.delete(url);
  });

  previewInFlight.set(url, request);
  return request;
}

// ─── 书签悬浮信息卡 ─────────────────────────────────────────────────────

interface BookmarkHoverCardProps {
  title: string;
  url: string;
  summary?: string;
  tags?: string[];
  anchorRect: DOMRect;
}

export const BookmarkHoverCard = memo(function BookmarkHoverCard({
  title,
  url,
  summary,
  tags,
  anchorRect,
}: BookmarkHoverCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const normalizedUrl = useMemo(() => normalizeBookmarkUrl(url), [url]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number; flip: boolean }>({
    x: 0, y: 0, flip: false,
  });

  useEffect(() => {
    let disposed = false;

    if (!normalizedUrl) {
      setPreviewUrl(null);
      return () => {
        disposed = true;
      };
    }

    loadPreview(normalizedUrl).then((entry) => {
      if (disposed) return;
      setPreviewUrl(entry.status === "success" ? entry.previewUrl : null);
    });

    return () => {
      disposed = true;
    };
  }, [normalizedUrl]);

  // 计算定位：图标下方居中，超出视口则翻转到上方
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const { width: cw, height: ch } = el.getBoundingClientRect();
    const cx = anchorRect.left + anchorRect.width / 2 - cw / 2;
    const below = anchorRect.bottom + 6;
    const above = anchorRect.top - ch - 6;
    const flip = below + ch > window.innerHeight && above > 0;
    setPos({
      x: Math.max(8, Math.min(cx, window.innerWidth - cw - 8)),
      y: flip ? above : below,
      flip,
    });
  }, [anchorRect]);

  let domain = "";
  try { domain = new URL(url).hostname.replace(/^(www|m|app|web|v|mobile|wap)\./i, ""); } catch { domain = url; }

  return createPortal(
    <div
      ref={cardRef}
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: pos.x,
        top: pos.y,
      }}
    >
      <div
        className="shadow-xl overflow-hidden"
        style={{
          background: "var(--os-color-dock-tooltip-bg)",
          color: "var(--os-color-dock-tooltip-text)",
          maxWidth: 240,
          padding: "var(--os-spacing-sm) var(--os-spacing-md)",
          borderRadius: "var(--os-metrics-radius)",
          animation: "hovercard-in 150ms ease-out forwards",
        }}
      >
        <div className="font-semibold truncate" style={{ fontSize: "var(--os-text-sm)" }}>{title}</div>
        <div className="truncate" style={{ fontSize: "var(--os-text-xs)", opacity: 0.5 }}>{domain}</div>
        {summary && (
          <div className="line-clamp-2" style={{ fontSize: "var(--os-text-xs)", opacity: 0.7, marginTop: "var(--os-spacing-xs)" }}>{summary}</div>
        )}
        {previewUrl && (
          <div
            className="overflow-hidden"
            style={{
              borderRadius: "calc(var(--os-metrics-radius) - 2px)",
              marginTop: "var(--os-spacing-sm)",
              marginBottom: "var(--os-spacing-xs)",
              background: "rgba(0,0,0,0.08)",
            }}
          >
            <img
              src={previewUrl}
              alt=""
              className="block w-full h-auto object-cover"
              style={{ aspectRatio: "16 / 10" }}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1" style={{ marginTop: "var(--os-spacing-xs)" }}>
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="truncate"
                style={{
                  fontSize: "var(--os-text-xs)",
                  padding: "1px var(--os-spacing-xs)",
                  borderRadius: "var(--os-metrics-radius)",
                  background: "color-mix(in srgb, currentColor 15%, transparent)",
                  opacity: 0.8,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
});
