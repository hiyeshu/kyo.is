/**
 * [INPUT]: 依赖 framer-motion 的 motion/useMotionValue/animate，依赖 hooks/useDesktopGrid 的分页计算，
 *          依赖 components/layout/DesktopIcons 的图标组件，依赖 config/appRegistry 的应用配置
 * [OUTPUT]: 对外提供 MobileDesktopGrid 组件，移动端 iPhone 风格滑页桌面
 * [POS]: components/layout/ 的移动端桌面布局，被 Desktop.tsx 在 isMobile 时渲染
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { memo, useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, useMotionValue, animate } from "framer-motion";
import { useTranslation } from "react-i18next";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useDesktopGrid, type DesktopGridItem } from "@/hooks/useDesktopGrid";
import { DesktopIcon, BookmarkIconWrapper } from "@/components/layout/DesktopIcons";
import { AppId, getAppIconPath } from "@/config/appRegistry";
import { getTranslatedAppName } from "@/utils/i18n";
import type { AnyApp } from "@/apps/base/types";
import type { Bookmark } from "@/stores/useBookmarkStore";

// ─── Props ────────────────────────────────────────────────────────────

interface MobileDesktopGridProps {
  apps: AnyApp[];
  bookmarks: Bookmark[];
  theme: string;
  isXpTheme: boolean;
  selectedAppId: string | null;
  selectedBookmarkIds: Set<string>;
  onAppClick: (appId: string, rect: DOMRect) => void;
  onAppContextMenu: (appId: string, x: number, y: number) => void;
  onBookmarkOpen: (bookmark: Bookmark) => void;
  onBookmarkSelect: (bookmark: Bookmark) => void;
  onBookmarkContextMenu: (bookmark: Bookmark, x: number, y: number) => void;
  onOpenSearch?: () => void;
}

// ─── 滑页常量 ─────────────────────────────────────────────────────────
const SNAP_THRESHOLD = 0.2; // 页宽的 20% 触发翻页
const VELOCITY_THRESHOLD = 500; // px/s 快速滑动触发翻页
const SPRING_CONFIG = { stiffness: 300, damping: 30 };
const SEARCH_BAR_AREA = 44; // 搜索栏 + 圆点指示器区域高度
// Dock 高度通过 CSS 变量感知：var(--os-dock-height) + safe-area
const DOCK_BOTTOM_CSS = "calc(var(--os-dock-height, 56px) + env(safe-area-inset-bottom, 0px))";

// ─── 记忆化图标包装器（稳定回调，消除翻页时无意义重渲染）────────────

const MobileAppIcon = memo(function MobileAppIcon({
  appId,
  theme,
  isSelected,
  onAppClick,
  onAppContextMenu,
}: {
  appId: string;
  theme: string;
  isSelected: boolean;
  onAppClick: (appId: string, rect: DOMRect) => void;
  onAppContextMenu: (appId: string, x: number, y: number) => void;
}) {
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onAppClick(appId, rect);
  }, [appId, onAppClick]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onAppContextMenu(appId, e.clientX, e.clientY);
  }, [appId, onAppContextMenu]);

  return (
    <DesktopIcon
      label={getTranslatedAppName(appId as AppId)}
      icon={getAppIconPath(appId as AppId, theme)}
      isSelected={isSelected}
      theme={theme}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    />
  );
});

const MobileBookmarkItem = memo(function MobileBookmarkItem({
  bookmark,
  isSelected,
  theme,
  onBookmarkOpen,
  onBookmarkSelect,
  onBookmarkContextMenu,
}: {
  bookmark: Bookmark;
  isSelected: boolean;
  theme: string;
  onBookmarkOpen: (bookmark: Bookmark) => void;
  onBookmarkSelect: (bookmark: Bookmark) => void;
  onBookmarkContextMenu: (bookmark: Bookmark, x: number, y: number) => void;
}) {
  const handleOpen = useCallback(() => onBookmarkOpen(bookmark), [bookmark, onBookmarkOpen]);
  const handleSelect = useCallback(() => onBookmarkSelect(bookmark), [bookmark, onBookmarkSelect]);
  const handleContextMenu = useCallback(
    (cx: number, cy: number) => onBookmarkContextMenu(bookmark, cx, cy),
    [bookmark, onBookmarkContextMenu]
  );

  return (
    <BookmarkIconWrapper
      bookmark={bookmark}
      isMobile={true}
      isSelected={isSelected}
      theme={theme}
      onOpen={handleOpen}
      onSelect={handleSelect}
      onContextMenu={handleContextMenu}
    />
  );
});

// ─── 主组件 ───────────────────────────────────────────────────────────

export function MobileDesktopGrid({
  apps,
  bookmarks,
  theme,
  isXpTheme,
  selectedAppId,
  selectedBookmarkIds,
  onAppClick,
  onAppContextMenu,
  onBookmarkOpen,
  onBookmarkSelect,
  onBookmarkContextMenu,
  onOpenSearch,
}: MobileDesktopGridProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [currentPage, setCurrentPage] = useState(0);
  const dotsTimerRef = useRef<number | null>(null);
  const dotsElRef = useRef<HTMLDivElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const pullStartY = useRef<number | null>(null);
  const x = useMotionValue(0);

  // ─── 下拉触发搜索 ─────────────────────────────────────────────
  const PULL_THRESHOLD = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    pullStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (pullStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - pullStartY.current;
    pullStartY.current = null;
    if (dy > PULL_THRESHOLD) onOpenSearch?.();
  }, [onOpenSearch]);

  // ─── 容器尺寸监听 ───────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ─── 构建统一图标列表（记忆化，防止 useMemo 失效）─────────────────
  const items = useMemo<DesktopGridItem[]>(
    () => [
      ...apps.map((app) => ({ id: app.id, type: "app" as const })),
      ...bookmarks.map((bm) => ({ id: bm.id, type: "bookmark" as const })),
    ],
    [apps, bookmarks]
  );

  const { columns, totalPages, pages } = useDesktopGrid(
    items,
    containerSize.width,
    containerSize.height - SEARCH_BAR_AREA
  );

  const pageWidth = containerSize.width;

  // ─── 页码越界修正 ───────────────────────────────────────────────
  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      const safePage = totalPages - 1;
      setCurrentPage(safePage);
      animate(x, -safePage * pageWidth, SPRING_CONFIG);
    }
  }, [totalPages, currentPage, pageWidth, x]);

  // ─── 圆点指示器显隐 ─────────────────────────────────────────────
  const showDots = useCallback(() => {
    if (dotsTimerRef.current) clearTimeout(dotsTimerRef.current);
    if (dotsElRef.current) dotsElRef.current.style.opacity = "1";
    if (searchBtnRef.current) searchBtnRef.current.style.opacity = "0";
  }, []);

  const hidDotsDelayed = useCallback(() => {
    if (dotsTimerRef.current) clearTimeout(dotsTimerRef.current);
    dotsTimerRef.current = window.setTimeout(() => {
      if (dotsElRef.current) dotsElRef.current.style.opacity = "0";
      if (searchBtnRef.current) searchBtnRef.current.style.opacity = "1";
    }, 1200);
  }, []);

  useEffect(() => {
    return () => { if (dotsTimerRef.current) clearTimeout(dotsTimerRef.current); };
  }, []);

  // ─── 滑动结束处理 ───────────────────────────────────────────────
  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      if (pageWidth <= 0) return;

      let newPage = currentPage;
      const offsetRatio = Math.abs(info.offset.x) / pageWidth;

      if (info.offset.x < 0 && (offsetRatio > SNAP_THRESHOLD || info.velocity.x < -VELOCITY_THRESHOLD)) {
        newPage = Math.min(currentPage + 1, totalPages - 1);
      } else if (info.offset.x > 0 && (offsetRatio > SNAP_THRESHOLD || info.velocity.x > VELOCITY_THRESHOLD)) {
        newPage = Math.max(currentPage - 1, 0);
      }

      setCurrentPage(newPage);
      animate(x, -newPage * pageWidth, SPRING_CONFIG);
      hidDotsDelayed();
    },
    [currentPage, totalPages, pageWidth, x, hidDotsDelayed]
  );

  // ─── 点击圆点跳转 ───────────────────────────────────────────────
  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(page);
      animate(x, -page * pageWidth, SPRING_CONFIG);
    },
    [pageWidth, x]
  );

  // ─── 查找原始数据（记忆化）────────────────────────────────────────
  const appMap = useMemo(() => new Map(apps.map((a) => [a.id, a])), [apps]);
  const bookmarkMap = useMemo(() => new Map(bookmarks.map((b) => [b.id, b])), [bookmarks]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col z-10"
      style={{
        paddingTop: isXpTheme ? 8 : 24,
        paddingBottom: `calc(${DOCK_BOTTOM_CSS} + 16px)`,
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 滑页容器 */}
      <div className="flex-1 overflow-hidden" style={{ paddingBottom: SEARCH_BAR_AREA }}>
        <motion.div
          className="flex h-full"
          style={{
            x,
            width: `${totalPages * 100}%`,
            touchAction: "pan-y",
            willChange: "transform",
            backfaceVisibility: "hidden",
          }}
          drag={totalPages > 1 ? "x" : false}
          dragConstraints={{
            left: -(totalPages - 1) * pageWidth,
            right: 0,
          }}
          dragElastic={0.15}
          dragDirectionLock
          onDragStart={showDots}
          onDragEnd={handleDragEnd}
          dragMomentum={false}
        >
          {pages.map((pageItems, pageIndex) => {
            // 只渲染当前页 ± 1，其余占位（虚拟化）
            const isVisible = Math.abs(pageIndex - currentPage) <= 1;

            return (
              <div
                key={pageIndex}
                className="grid place-items-center"
                style={{
                  width: pageWidth || "100%",
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  alignContent: "start",
                  padding: "8px 12px 0",
                  gap: "12px 0",
                  // 隐藏页：保持占位但不渲染子元素
                  visibility: isVisible ? "visible" : "hidden",
                  contain: "layout style paint",
                }}
              >
                {isVisible && pageItems.map((item) => {
                if (item.type === "app") {
                  const app = appMap.get(item.id);
                  if (!app) return null;
                  return (
                    <MobileAppIcon
                      key={item.id}
                      appId={app.id}
                      theme={theme}
                      isSelected={selectedAppId === app.id}
                      onAppClick={onAppClick}
                      onAppContextMenu={onAppContextMenu}
                    />
                  );
                }

                const bm = bookmarkMap.get(item.id);
                if (!bm) return null;
                return (
                  <MobileBookmarkItem
                    key={item.id}
                    bookmark={bm}
                    isSelected={selectedBookmarkIds.has(bm.id)}
                    theme={theme}
                    onBookmarkOpen={onBookmarkOpen}
                    onBookmarkSelect={onBookmarkSelect}
                    onBookmarkContextMenu={onBookmarkContextMenu}
                  />
                );
              })}
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* 搜索栏 + 圆点 — Portal 逃离 z-10 牢笼，浮在 Dock 之上 */}
      {createPortal(
        <div
          className="fixed left-0 right-0 flex justify-center items-center pointer-events-none"
          style={{
            bottom: `calc(${DOCK_BOTTOM_CSS} + 8px)`,
            height: 36,
            zIndex: 51,
          }}
        >
          {/* 搜索栏 — 常驻 */}
          <button
            ref={searchBtnRef}
            className="pointer-events-auto flex items-center gap-1.5 px-4 h-8 rounded-full transition-opacity duration-300"
            style={{
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
            onClick={onOpenSearch}
          >
            <MagnifyingGlass size={13} weight="bold" className="text-white/70" />
            <span className="text-[11px] text-white/70">{t("common.search.label", "搜索")}</span>
          </button>

          {/* 圆点指示器 — 滑动时淡入 */}
          <div
            ref={dotsElRef}
            className="absolute inset-0 flex justify-center items-center gap-1.5 transition-opacity duration-300 pointer-events-none"
            style={{ opacity: 0 }}
          >
            {Array.from({ length: Math.max(totalPages, 1) }, (_, i) => (
              <button
                key={i}
                className={`pointer-events-auto w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                  i === currentPage ? "bg-white" : "bg-white/30"
                }`}
                onClick={() => totalPages > 1 && goToPage(i)}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
