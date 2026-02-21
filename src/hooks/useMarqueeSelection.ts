/**
 * [INPUT]: React hooks (useState, useRef, useCallback, useEffect)
 * [OUTPUT]: useMarqueeSelection hook — 框选矩形、选中 ID 集合、交互处理函数
 * [POS]: hooks/ 的桌面框选逻辑封装，被 Desktop.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useCallback, useEffect } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MarqueeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface UseMarqueeSelectionOptions {
  /** 容器 ref，用于坐标转换 */
  containerRef: React.RefObject<HTMLElement | null>;
  /** 是否启用（移动端禁用） */
  enabled?: boolean;
  /** 所有可选元素的 data 属性选择器 */
  itemSelector?: string;
  /** 死区阈值（px），区分点击和拖拽 */
  deadZone?: number;
}

interface UseMarqueeSelectionReturn {
  marqueeRect: MarqueeRect | null;
  isSelecting: boolean;
  selectedIds: Set<string>;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;
  setSelectedIds: (ids: Set<string>) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  /** 框选刚结束的标记，用于跳过 click 事件 */
  justFinishedRef: React.RefObject<boolean>;
}

// ─── AABB 碰撞检测 ─────────────────────────────────────────────────────────

function rectsOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number }
): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useMarqueeSelection({
  containerRef,
  enabled = true,
  itemSelector = "[data-bookmark-id]",
  deadZone = 5,
}: UseMarqueeSelectionOptions): UseMarqueeSelectionReturn {
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 内部 refs
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const cachedRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const justFinishedRef = useRef(false);

  // ─── 快照图标 rects ──────────────────────────────────────────────────────
  const snapshotItemRects = useCallback(() => {
    const map = new Map<string, DOMRect>();
    const container = containerRef.current;
    if (!container) return map;
    const items = container.querySelectorAll(itemSelector);
    items.forEach((el) => {
      const id = (el as HTMLElement).dataset.bookmarkId;
      if (id) map.set(id, el.getBoundingClientRect());
    });
    return map;
  }, [containerRef, itemSelector]);

  // ─── mousedown（仅空白区域左键） ─────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return;
      if (e.button !== 0) return; // 仅左键
      const target = e.target as HTMLElement;
      if (target.closest("[data-desktop-icon]")) return; // 点击图标不启动框选

      startPointRef.current = { x: e.clientX, y: e.clientY };
      isDraggingRef.current = false;
      justFinishedRef.current = false;
    },
    [enabled]
  );

  // ─── mousemove / mouseup（挂 window） ────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      const start = startPointRef.current;
      if (!start) return;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;

      // 死区检测
      if (!isDraggingRef.current) {
        if (Math.abs(dx) < deadZone && Math.abs(dy) < deadZone) return;
        isDraggingRef.current = true;
        setIsSelecting(true);
        cachedRectsRef.current = snapshotItemRects();
      }

      // 计算选框（视口坐标）
      const left = Math.min(start.x, e.clientX);
      const top = Math.min(start.y, e.clientY);
      const width = Math.abs(dx);
      const height = Math.abs(dy);

      setMarqueeRect({ left, top, width, height });

      // 碰撞检测
      const marquee = { left, top, right: left + width, bottom: top + height };
      const hits = new Set<string>();
      cachedRectsRef.current.forEach((rect, id) => {
        const item = {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
        };
        if (rectsOverlap(marquee, item)) hits.add(id);
      });
      setSelectedIds(hits);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        justFinishedRef.current = true;
        // 短暂延迟后重置，让 click 事件有机会检查
        setTimeout(() => { justFinishedRef.current = false; }, 200);
      }
      startPointRef.current = null;
      isDraggingRef.current = false;
      setIsSelecting(false);
      setMarqueeRect(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [enabled, deadZone, snapshotItemRects]);

  // ─── 公开方法 ────────────────────────────────────────────────────────────
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  return {
    marqueeRect,
    isSelecting,
    selectedIds,
    clearSelection,
    selectAll,
    setSelectedIds,
    handleMouseDown,
    justFinishedRef,
  };
}
