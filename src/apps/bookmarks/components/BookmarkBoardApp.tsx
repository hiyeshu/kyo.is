/**
 * [INPUT]: 依赖 components/layout/WindowFrame, components/ui, hooks/useBookmarkBoard, stores/useBookmarkStore
 * [OUTPUT]: 对外提供 BookmarkBoardApp 组件
 * [POS]: apps/bookmarks/components/ 的根组件，书签应用主容器，平铺布局 + 排序 + 域名聚合
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React, { useRef, useState } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { RightClickMenu, type MenuItem } from "@/components/ui/right-click-menu";
import { appMetadata, helpItems } from "../metadata";
import { BookmarkBoardMenuBar } from "./BookmarkBoardMenuBar";
import { useBookmarkBoard } from "../hooks/useBookmarkBoard";
import { useBookmarkStore, type Bookmark } from "@/stores/useBookmarkStore";
import { BookmarkIconDisplay } from "./BookmarkIconDisplay";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "@/stores/useThemeStore";
import { cn } from "@/lib/utils";

// ─── 书签卡片 ────────────────────────────────────────────────────────────────

function BookmarkCard({
  bm,
  onClick,
  onContextMenu,
  onLongPress,
  onDragStart,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver,
  isContextTarget,
  isMacTheme,
}: {
  bm: Bookmark;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onLongPress: (e: React.TouchEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging: boolean;
  isDragOver: boolean;
  isContextTarget: boolean;
  isMacTheme: boolean;
}) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      onLongPress(e);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!longPressTimerRef.current || !touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 p-2 rounded-xl cursor-pointer group relative transition-all",
        isDragging ? "opacity-50 scale-95" : "hover:bg-black/[0.06] active:bg-black/10",
        isContextTarget && "bg-black/[0.06]",
        isDragOver && "ring-2 ring-blue-500 ring-offset-1"
      )}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      title={bm.url}
    >
      <div 
        className={cn(
          "rounded-xl flex items-center justify-center relative overflow-hidden",
          "bg-gradient-to-b from-white to-white/90",
          "border border-black/10",
          "shadow-[0_1px_3px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)]",
          "group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
          isContextTarget && "shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
          "transition-shadow"
        )}
        style={{
          width: "var(--os-icon-bookmark)",
          height: "var(--os-icon-bookmark)",
        }}
      >
        <BookmarkIconDisplay bookmark={bm} size="sm" />
        {isMacTheme && (
          <div 
            className="absolute inset-0 pointer-events-none rounded-xl"
            style={{
              background: "linear-gradient(to bottom, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 50%, transparent 50%, rgba(0,0,0,0.03) 100%)",
            }}
          />
        )}
      </div>
      <span 
        className={cn("text-center line-clamp-2 w-full font-geneva-12 leading-tight text-black/70 group-hover:text-black/90", isContextTarget && "text-black/90")}
        style={{ fontSize: "var(--os-text-xs)" }}
      >
        {bm.title}
      </span>
    </div>
  );
}

// ─── 书签网格（可复用） ───────────────────────────────────────────────────────

function BookmarkGrid({
  bookmarks,
  h,
  isMacTheme,
}: {
  bookmarks: Bookmark[];
  h: ReturnType<typeof useBookmarkBoard>;
  isMacTheme: boolean;
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1">
      {bookmarks.map((bm, index) => (
        <BookmarkCard
          key={bm.id}
          bm={bm}
          onClick={() => h.openBookmark(bm.id, bm.url)}
          onContextMenu={(e) => h.openContextMenu(e, bm)}
          onLongPress={(e) => {
            const touch = e.touches[0];
            h.openContextMenu(
              { preventDefault: () => {}, stopPropagation: () => {}, clientX: touch.clientX, clientY: touch.clientY } as unknown as React.MouseEvent,
              bm
            );
          }}
          onDragStart={(e) => h.handleDragStart(e, bm, index)}
          onDragOver={(e) => h.handleDragOver(e, index)}
          onDragEnter={h.handleDragEnter}
          onDragLeave={h.handleDragLeave}
          onDrop={(e) => h.handleDrop(e, index)}
          onDragEnd={h.handleDragEnd}
          isDragging={h.draggedItem?.item.id === bm.id}
          isDragOver={h.dragOverIndex === index}
          isContextTarget={h.contextMenu?.target.kind === "bookmark" && h.contextMenu.target.item.id === bm.id}
          isMacTheme={isMacTheme}
        />
      ))}
    </div>
  );
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────

export function BookmarkBoardApp({
  isWindowOpen,
  onClose,
  isForeground,
  skipInitialSound,
  instanceId,
  onNavigateNext,
  onNavigatePrevious,
}: AppProps<unknown>) {
  const { t } = useTranslation();
  const h = useBookmarkBoard();
  const updateBookmark = useBookmarkStore((s) => s.updateBookmark);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const currentTheme = useThemeStore((s) => s.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  const isMacTheme = currentTheme === "macosx";

  // ─── 右键菜单项 ─────────────────────────────────────────────────────────────
  const getContextMenuItems = (): MenuItem[] => {
    if (!h.contextMenu) return [];
    const { target } = h.contextMenu;

    if (target.kind === "empty") {
      return [
        {
          type: "item",
          label: t("apps.bookmarks.addBookmark", "添加书签"),
          icon: "➕",
          onSelect: () => { h.openAddDialog(); h.closeContextMenu(); },
        },
        { type: "separator" },
        {
          type: "radioGroup",
          value: h.sortMode,
          onChange: (val) => { h.setSortMode(val as "recent" | "name"); h.closeContextMenu(); },
          items: [
            { label: t("apps.bookmarks.sortByName", "按名称排序"), value: "name" },
            { label: t("apps.bookmarks.sortByRecent", "按最近使用排序"), value: "recent" },
          ],
        },
        { type: "separator" },
        {
          type: "checkbox",
          label: t("apps.bookmarks.groupByDomain", "按域名聚合"),
          checked: h.groupByDomain,
          onSelect: () => { h.setGroupByDomain(!h.groupByDomain); h.closeContextMenu(); },
        },
      ];
    }

    const item = target.item;
    return [
      {
        type: "item",
        label: t("apps.bookmarks.openInNewTab", "打开链接"),
        onSelect: () => { h.openBookmark(item.id, item.url); h.closeContextMenu(); },
      },
      {
        type: "item",
        label: t("common.dock.copyUrl", "复制链接"),
        onSelect: () => { navigator.clipboard.writeText(item.url); h.closeContextMenu(); },
      },
      { type: "separator" },
      {
        type: "item",
        label: t("common.contextMenu.addToDesktop", "放到桌面"),
        onSelect: () => { updateBookmark(item.id, { onDesktop: true }); h.closeContextMenu(); },
      },
      {
        type: "item",
        label: t("apps.bookmarks.addToDock", "放到 Dock"),
        onSelect: () => { updateBookmark(item.id, { inDock: true }); h.closeContextMenu(); },
      },
      { type: "separator" },
      {
        type: "item",
        label: t("common.menu.delete", "删除"),
        onSelect: () => { setPendingDeleteId(item.id); h.closeContextMenu(); },
      },
    ];
  };

  const menuBar = (
    <BookmarkBoardMenuBar
      onAddBookmark={() => h.openAddDialog()}
      onResetBookmarks={() => h.setResetDialogOpen(true)}
      onShowHelp={() => h.setHelpOpen(true)}
      onShowAbout={() => h.setAboutOpen(true)}
      onClose={onClose}
    />
  );

  if (!isWindowOpen) return null;

  return (
    <>
      {!h.isXpTheme && isForeground && menuBar}
      
      {h.contextMenu && (
        <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", position: "relative", width: "100%", height: "100%" }}>
            <RightClickMenu
              items={getContextMenuItems()}
              position={{ x: h.contextMenu.x, y: h.contextMenu.y }}
              onClose={h.closeContextMenu}
            />
          </div>
        </div>
      )}
      
      <WindowFrame
        title={t("apps.bookmarks.name", "我的收藏")}
        onClose={onClose}
        isForeground={isForeground}
        appId="bookmarks"
        skipInitialSound={skipInitialSound}
        instanceId={instanceId}
        onNavigateNext={onNavigateNext}
        onNavigatePrevious={onNavigatePrevious}
        menuBar={undefined}
      >
        <div className="flex flex-col h-full w-full bg-white/85">
          {/* ── 搜索栏 ─────────────────────────────────────────── */}
          {h.isXpTheme ? (
            <div 
              className="flex items-center gap-3 px-3 border-b"
              style={{
                height: "44px",
                backgroundColor: "#ece9d8",
                borderColor: "#919b9c",
              }}
            >
              {/* 搜索输入框 — 经典 3D inset 边框 */}
              <div 
                className="flex items-center flex-1 gap-2 px-3"
                style={{
                  height: "28px",
                  backgroundColor: "#ffffff",
                  boxShadow: "inset 1px 1px 0 #808080, inset -1px -1px 0 #fff, inset 2px 2px 0 #404040",
                  border: "1px solid #000",
                }}
              >
                <MagnifyingGlass size={16} className="text-black/50 shrink-0" />
                <input
                  type="text"
                  value={h.searchQuery}
                  onChange={(e) => h.setSearchQuery(e.target.value)}
                  placeholder={t("apps.bookmarks.search", "Search bookmarks...")}
                  className="flex-1 bg-transparent outline-none placeholder:text-black/40"
                  style={{
                    fontSize: "13px",
                    fontFamily: '"Pixelated MS Sans Serif", Tahoma, Arial, sans-serif',
                  }}
                />
              </div>
              {/* 添加按钮 — 经典 3D raised 按钮 */}
              <button
                onClick={() => h.openAddDialog()}
                className="flex items-center justify-center shrink-0"
                style={{
                  width: "28px",
                  height: "28px",
                  backgroundColor: "#ece9d8",
                  boxShadow: "inset -1px -1px 0 #404040, inset 1px 1px 0 #fff, inset -2px -2px 0 #808080, inset 2px 2px 0 #ece9d8",
                  border: "1px solid #000",
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.boxShadow = "inset 1px 1px 0 #404040, inset -1px -1px 0 #fff";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.boxShadow = "inset -1px -1px 0 #404040, inset 1px 1px 0 #fff, inset -2px -2px 0 #808080, inset 2px 2px 0 #ece9d8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "inset -1px -1px 0 #404040, inset 1px 1px 0 #fff, inset -2px -2px 0 #808080, inset 2px 2px 0 #ece9d8";
                }}
              >
                <Plus size={16} weight="bold" className="text-black/70" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 px-3 py-2 border-b border-black/20"
              style={{
                backgroundColor: "var(--os-color-window-bg, #f5f5f5)",
                backgroundImage: "var(--os-pinstripe-window)",
              }}
            >
              <div className="flex items-center flex-1 gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-black/15 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-blue-400/50 focus-within:border-blue-400/50">
                <MagnifyingGlass size={14} className="text-black/40 shrink-0" />
                <input
                  type="text"
                  value={h.searchQuery}
                  onChange={(e) => h.setSearchQuery(e.target.value)}
                  placeholder={t("apps.bookmarks.search", "Search bookmarks...")}
                  className="flex-1 text-[12px] bg-transparent outline-none placeholder:text-black/30"
                />
              </div>
              <button
                onClick={() => h.openAddDialog()}
                className="w-7 h-7 flex items-center justify-center shrink-0 transition-all rounded-full bg-white/80 border border-black/15 shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:bg-white hover:border-black/20 active:bg-black/5"
              >
                <Plus size={16} weight="bold" className="text-black/60" />
              </button>
            </div>
          )}

          {/* ── 书签网格 ──────────────────────────────────── */}
          <div
            className="flex-1 overflow-y-auto p-3"
            onContextMenu={h.openEmptyContextMenu}
          >
            {h.groupedByDomain && h.groupedByDomain.length > 0 ? (
              h.groupedByDomain.map(([domain, bookmarks]) => (
                <div key={domain} className="mb-3">
                  <div className="flex items-center gap-1.5 mb-1.5 px-1">
                    <span className="text-[11px] font-geneva-12 font-medium text-black/50 uppercase tracking-wider cursor-default">
                      {domain}
                    </span>
                    <div className="flex-1 h-px bg-black/10" />
                  </div>
                  <BookmarkGrid bookmarks={bookmarks} h={h} isMacTheme={isMacTheme} />
                </div>
              ))
            ) : h.sortedItems.length > 0 ? (
              <BookmarkGrid bookmarks={h.sortedItems} h={h} isMacTheme={isMacTheme} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-black/30 gap-2">
                <span className="text-sm font-geneva-12">
                  {h.searchQuery
                    ? t("apps.bookmarks.noResults", "没有结果")
                    : t("apps.bookmarks.noBookmarksYet", "尚无书签")}
                </span>
                {!h.searchQuery && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => h.openAddDialog()}>
                    {t("apps.bookmarks.addFirstBookmark", "新增第一个书签")}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 添加书签对话框 ──────────────────────────────── */}
        <Dialog open={h.addDialogOpen} onOpenChange={h.setAddDialogOpen}>
          <DialogContent 
            className={cn("sm:max-w-[420px] p-0 gap-0 overflow-hidden", isXpTheme && "p-0")}
            style={isXpTheme ? { fontSize: "11px" } : undefined}
          >
            <DialogHeader>
              <DialogTitle 
                className={cn("text-sm font-medium", isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]")}
              >
                {t("apps.bookmarks.addBookmark", "添加书签")}
              </DialogTitle>
            </DialogHeader>
            <div className="flex">
              <div
                className="w-[100px] shrink-0 flex items-center justify-center border-r border-black/10"
                style={{
                  backgroundColor: "var(--os-color-window-bg, #f5f5f5)",
                  backgroundImage: "var(--os-pinstripe-window)",
                }}
              >
                <BookmarkIconDisplay
                  bookmark={{
                    id: "preview", title: h.addUrl, url: h.addUrl,
                    summary: "", tags: [], createdAt: "",
                    icon: undefined, favicon: h.previewFavicon || undefined,
                  }}
                  size="lg"
                />
              </div>
              <DialogBody className={isXpTheme ? "flex-1 p-2 px-4" : "flex-1 p-4"}>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label 
                      htmlFor="bm-url" 
                      className={cn("text-[11px] text-black/50", isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial]")}
                    >
                      {t("apps.bookmarks.url", "网址")}
                    </Label>
                    <Input
                      id="bm-url"
                      value={h.addUrl}
                      onChange={(e) => h.setAddUrl(e.target.value)}
                      placeholder={t("apps.bookmarks.url", "网址")}
                      className={cn("text-xs h-8", isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]")}
                      onKeyDown={(e) => e.key === "Enter" && h.submitAiBookmark()}
                      autoFocus
                    />
                  </div>
                </div>
                <DialogFooter className="pt-4 gap-1">
                  <Button
                    variant={isMacTheme ? "secondary" : "retro"}
                    size="sm"
                    onClick={() => h.setAddDialogOpen(false)}
                    className={cn(!isMacTheme && "h-7", isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]")}
                  >
                    {t("common.dialog.cancel", "取消")}
                  </Button>
                  <Button
                    variant={isMacTheme ? "default" : "retro"}
                    size="sm"
                    onClick={h.submitAiBookmark}
                    disabled={!h.addUrl.trim() || h.isAiCreating}
                    className={cn(!isMacTheme && "h-7", isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]")}
                  >
                    {h.isAiCreating ? t("common.loading.default", "载入中...") : t("apps.bookmarks.add", "新增")}
                  </Button>
                </DialogFooter>
              </DialogBody>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── 系统对话框 ──────────────────────────────────── */}
        <HelpDialog isOpen={h.helpOpen} onOpenChange={h.setHelpOpen} helpItems={helpItems} appId="bookmarks" />
        <AboutDialog isOpen={h.aboutOpen} onOpenChange={h.setAboutOpen} metadata={appMetadata} appId="bookmarks" />
        <ConfirmDialog
          isOpen={h.resetDialogOpen}
          onOpenChange={h.setResetDialogOpen}
          onConfirm={h.confirmReset}
          title={t("apps.bookmarks.resetTitle", "重置书签")}
          description={t("apps.bookmarks.resetDescription", "重置所有书签为预设值？此操作无法还原。")}
        />
        <ConfirmDialog
          isOpen={pendingDeleteId !== null}
          onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
          onConfirm={() => { if (pendingDeleteId) h.removeBookmark(pendingDeleteId); setPendingDeleteId(null); }}
          title={t("apps.bookmarks.deleteTitle", "删除书签")}
          description={t("apps.bookmarks.deleteDescription", "确定要永久删除此书签吗？此操作无法还原。")}
        />
      </WindowFrame>
    </>
  );
}
