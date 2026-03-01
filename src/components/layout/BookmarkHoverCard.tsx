/**
 * [INPUT]: 依赖 react 的 useState/useEffect/useRef，依赖 react-dom 的 createPortal
 * [OUTPUT]: 对外提供 BookmarkHoverCard 组件
 * [POS]: components/layout/ 的书签悬浮信息卡，被 DesktopIcons.tsx 和 Desktop.tsx 的 BookmarkIconWrapper 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useRef, useLayoutEffect, useState, memo } from "react";
import { createPortal } from "react-dom";

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
  const [pos, setPos] = useState<{ x: number; y: number; flip: boolean }>({
    x: 0, y: 0, flip: false,
  });

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
