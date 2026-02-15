/**
 * [INPUT]: 依赖 framer-motion 动画，依赖 stores/useStickiesStore 类型，依赖 lib/utils 的 cn，依赖 i18n 的 useTranslation
 * [OUTPUT]: 对外提供 StickyNote 组件
 * [POS]: apps/stickies/components/ 的便签渲染器，被 StickiesApp 组合
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { StickyNote as StickyNoteType, StickyColor } from "@/stores/useStickiesStore";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

// Match WindowFrame open/close animation (scale 0.95 ↔ 1, opacity 0 ↔ 1)
const STICKY_ANIMATION = {
  initial: { scale: 0.95, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.2, ease: [0.33, 1, 0.68, 1] as const },
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    transition: { duration: 0.2, ease: [0.32, 0, 0.67, 0] as const },
  },
};

interface StickyNoteProps {
  note: StickyNoteType;
  onSelect: () => void;
  onUpdate: (updates: Partial<Omit<StickyNoteType, "id" | "createdAt">>) => void;
  onDelete: () => void;
  zIndex: number;
  isForeground: boolean;
}

const COLOR_TOKENS: Record<StickyColor, { bg: string; border: string; text: string }> = {
  yellow: {
    bg: "var(--os-sticky-yellow)",
    border: "var(--os-sticky-yellow-border)",
    text: "var(--os-sticky-text)",
  },
  blue: {
    bg: "var(--os-sticky-blue)",
    border: "var(--os-sticky-blue-border)",
    text: "var(--os-sticky-text)",
  },
  green: {
    bg: "var(--os-sticky-green)",
    border: "var(--os-sticky-green-border)",
    text: "var(--os-sticky-text)",
  },
  pink: {
    bg: "var(--os-sticky-pink)",
    border: "var(--os-sticky-pink-border)",
    text: "var(--os-sticky-text)",
  },
  purple: {
    bg: "var(--os-sticky-purple)",
    border: "var(--os-sticky-purple-border)",
    text: "var(--os-sticky-text)",
  },
  orange: {
    bg: "var(--os-sticky-orange)",
    border: "var(--os-sticky-orange-border)",
    text: "var(--os-sticky-text)",
  },
};

export function StickyNote({
  note,
  onSelect,
  onUpdate,
  onDelete,
  zIndex,
  isForeground,
}: StickyNoteProps) {
  const { t } = useTranslation();

  const noteRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draftPosition, setDraftPosition] = useState(note.position);
  const [draftSize, setDraftSize] = useState(note.size);
  const draftPositionRef = useRef(note.position);
  const draftSizeRef = useRef(note.size);

  const colors = COLOR_TOKENS[note.color];

  useEffect(() => {
    draftPositionRef.current = draftPosition;
  }, [draftPosition]);

  useEffect(() => {
    draftSizeRef.current = draftSize;
  }, [draftSize]);

  useEffect(() => {
    if (!isDragging) {
      setDraftPosition(note.position);
      draftPositionRef.current = note.position;
    }
  }, [note.position.x, note.position.y, isDragging]);

  useEffect(() => {
    if (!isResizing) {
      setDraftSize(note.size);
      draftSizeRef.current = note.size;
    }
  }, [note.size.width, note.size.height, isResizing]);

  // Handle drag start (mouse)
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      onSelect();
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - draftPositionRef.current.x,
        y: e.clientY - draftPositionRef.current.y,
      });
    },
    [onSelect]
  );

  // Handle drag start (touch)
  const handleTouchDragStart = useCallback(
    (e: React.TouchEvent) => {
      if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
      if ((e.target as HTMLElement).closest("button")) return;
      if (e.touches.length !== 1) return;
      e.preventDefault();
      onSelect();
      const touch = e.touches[0];
      setIsDragging(true);
      setDragOffset({
        x: touch.clientX - draftPositionRef.current.x,
        y: touch.clientY - draftPositionRef.current.y,
      });
    },
    [onSelect]
  );

  // Handle resize start (mouse)
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect();
      setIsResizing(true);
    },
    [onSelect]
  );

  // Handle resize start (touch)
  const handleTouchResizeStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect();
      setIsResizing(true);
    },
    [onSelect]
  );

  // Handle mouse/touch move for drag and resize
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMove = (clientX: number, clientY: number) => {
      if (isDragging) {
        let newX = clientX - dragOffset.x;
        let newY = clientY - dragOffset.y;

        // Constrain to viewport bounds
        const maxX = window.innerWidth - draftSizeRef.current.width;
        const maxY = window.innerHeight - draftSizeRef.current.height;
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(24, Math.min(newY, maxY)); // 24px for menu bar

        const nextPosition = { x: newX, y: newY };
        draftPositionRef.current = nextPosition;
        setDraftPosition(nextPosition);
      }

      if (isResizing) {
        const noteEl = noteRef.current;
        if (!noteEl) return;

        const rect = noteEl.getBoundingClientRect();
        const newWidth = Math.max(180, clientX - rect.left);
        const newHeight = Math.max(120, clientY - rect.top);

        const nextSize = { width: newWidth, height: newHeight };
        draftSizeRef.current = nextSize;
        setDraftSize(nextSize);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const handleEnd = () => {
      const updates: Partial<Omit<StickyNoteType, "id" | "createdAt">> = {};

      if (isDragging) {
        const finalPosition = draftPositionRef.current;
        if (
          finalPosition.x !== note.position.x ||
          finalPosition.y !== note.position.y
        ) {
          updates.position = finalPosition;
        }
      }

      if (isResizing) {
        const finalSize = draftSizeRef.current;
        if (
          finalSize.width !== note.size.width ||
          finalSize.height !== note.size.height
        ) {
          updates.size = finalSize;
        }
      }

      setIsDragging(false);
      setIsResizing(false);

      if (Object.keys(updates).length > 0) {
        onUpdate(updates);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
    document.addEventListener("touchcancel", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
      document.removeEventListener("touchcancel", handleEnd);
    };
  }, [
    isDragging,
    isResizing,
    dragOffset,
    note.position.x,
    note.position.y,
    note.size.width,
    note.size.height,
    onUpdate,
  ]);

  // Handle content change
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate({ content: e.target.value });
    },
    [onUpdate]
  );

  // When agent (or anything) updates position/size, animate there. During user drag/resize keep instant.
  const layoutTransition = {
    left: { duration: isDragging ? 0 : 0.2, ease: [0.33, 1, 0.68, 1] as const },
    top: { duration: isDragging ? 0 : 0.2, ease: [0.33, 1, 0.68, 1] as const },
    width: { duration: isResizing ? 0 : 0.2, ease: [0.33, 1, 0.68, 1] as const },
    height: { duration: isResizing ? 0 : 0.2, ease: [0.33, 1, 0.68, 1] as const },
  };

  return (
    <motion.div
      ref={noteRef}
      onMouseDown={onSelect}
      initial={{
        ...STICKY_ANIMATION.initial,
        left: draftPosition.x,
        top: draftPosition.y,
        width: draftSize.width,
        height: draftSize.height,
      }}
      animate={{
        scale: 1,
        opacity: 1,
        left: draftPosition.x,
        top: draftPosition.y,
        width: draftSize.width,
        height: draftSize.height,
      }}
      transition={{
        scale: { duration: 0.2, ease: [0.33, 1, 0.68, 1] as const },
        opacity: { duration: 0.2, ease: [0.33, 1, 0.68, 1] as const },
        ...layoutTransition,
      }}
      exit={STICKY_ANIMATION.exit}
      className={cn(
        "fixed flex flex-col overflow-hidden origin-top-left",
        isDragging && "opacity-95"
      )}
      style={{
        zIndex: zIndex,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: "1px",
        boxShadow: "var(--os-window-shadow)",
      }}
    >
      {/* Compact title bar - always rendered to prevent layout shift, but contents hidden when not foreground */}
      {/* Drag is always enabled so stickies can be moved even when title bar appears hidden */}
      <div
        onMouseDown={handleDragStart}
        onTouchStart={handleTouchDragStart}
        className="flex items-center h-[14px] px-[3px] select-none cursor-move"
        style={{
          backgroundColor: colors.bg,
          borderBottom: isForeground ? `1px solid ${colors.border}` : "none",
          touchAction: "none",
        }}
      >
        {/* Close button - only visible when foreground */}
        {isForeground && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="w-[9px] h-[9px] flex items-center justify-center"
            style={{
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.bg,
            }}
            title={t("common.menu.close", "Close")}
          />
        )}
      </div>

      {/* Content */}
      <textarea
        value={note.content}
        onChange={handleContentChange}
        placeholder={t("apps.stickies.placeholder", "Write a note...")}
        className={cn(
          "flex-1 px-2 pt-1 pb-2 resize-none outline-none bg-transparent font-geneva-12",
          "placeholder:text-[color:var(--os-color-text-secondary)] text-[13px]"
        )}
        style={{
          lineHeight: "1.5",
          color: colors.text,
        }}
      />

      {/* Resize handle with subtle triangle */}
      <div
        onMouseDown={handleResizeStart}
        onTouchStart={handleTouchResizeStart}
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize opacity-70"
        style={{
          background: `linear-gradient(135deg, transparent 50%, ${colors.border} 50%)`,
          touchAction: "none",
        }}
      />
    </motion.div>
  );
}
