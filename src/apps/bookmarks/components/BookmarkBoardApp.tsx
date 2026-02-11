/**
 * [INPUT]: 依赖 components/layout/WindowFrame, components/ui, hooks/useBookmarkBoard, stores/useBookmarkStore
 * [OUTPUT]: 对外提供 BookmarkBoardApp 组件
 * [POS]: apps/bookmarks/components/ 的根组件，书签应用主容器
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
import { MagnifyingGlass, Plus, FolderPlus, Link, DotsThree, PencilSimple, Trash, FolderSimple } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { RightClickMenu, type MenuItem } from "@/components/ui/right-click-menu";
import { appMetadata, helpItems } from "../metadata";
import { BookmarkBoardMenuBar } from "./BookmarkBoardMenuBar";
import { useBookmarkBoard } from "../hooks/useBookmarkBoard";
import { isFolder, type Bookmark, type BookmarkFolder } from "@/stores/useBookmarkStore";
import { IconPicker } from "./IconPicker";
import { BookmarkIconDisplay } from "./BookmarkIconDisplay";
import { useDockStore } from "@/stores/useDockStore";
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
  isMacTheme = false,
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
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
  isMacTheme?: boolean;
}) {
  // 长按检测
  const longPressTimerRef = useRef<number | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    longPressTimerRef.current = window.setTimeout(() => {
      onLongPress(e);
      longPressTimerRef.current = null;
    }, 500);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current || !longPressTimerRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    // 移动超过 10px 则取消长按
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
      {/* 图标容器 */}
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center relative overflow-hidden",
        "bg-gradient-to-b from-white to-white/90",
        "border border-black/10",
        "shadow-[0_1px_3px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)]",
        "group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
        "transition-shadow"
      )}>
        <BookmarkIconDisplay bookmark={bm} size="sm" />
        {/* macOS Aqua 水晶高光 */}
        {isMacTheme && (
          <div 
            className="absolute inset-0 pointer-events-none rounded-xl"
            style={{
              background: "linear-gradient(to bottom, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 50%, transparent 50%, rgba(0,0,0,0.03) 100%)",
            }}
          />
        )}
      </div>
      {/* 标题 - 双行截断 */}
      <span className="text-[11px] text-center line-clamp-2 w-full font-geneva-12 leading-tight text-black/70 group-hover:text-black/90">
        {bm.title}
      </span>
    </div>
  );
}

// ─── 文件夹区域 ──────────────────────────────────────────────────────────────

function FolderSection({
  folder,
  h,
  isDragOverFolder,
  onFolderDragOver,
  onFolderDragLeave,
  onFolderDrop,
  t,
}: {
  folder: BookmarkFolder;
  h: ReturnType<typeof useBookmarkBoard>;
  isDragOverFolder: boolean;
  onFolderDragOver: (e: React.DragEvent) => void;
  onFolderDragLeave: (e: React.DragEvent) => void;
  onFolderDrop: (e: React.DragEvent) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  return (
    <div 
      className={cn(
        "mb-3 rounded-lg transition-all",
        isDragOverFolder && "bg-blue-500/10 ring-2 ring-blue-500/30"
      )}
      onDragOver={onFolderDragOver}
      onDragLeave={onFolderDragLeave}
      onDrop={onFolderDrop}
    >
      <div 
        className="flex items-center gap-1.5 mb-1.5 px-1 group/folder"
        onContextMenu={(e) => h.openContextMenu(e, folder)}
      >
        <span className="text-[11px] font-geneva-12 font-medium text-black/50 uppercase tracking-wider cursor-default">
          {folder.title}
        </span>
        <div className="flex-1 h-px bg-black/10" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-5 h-5 rounded flex items-center justify-center",
                "text-black/40 hover:text-black/70 hover:bg-black/5",
                "opacity-0 group-hover/folder:opacity-100 transition-all"
              )}
            >
              <DotsThree size={18} weight="bold" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            <DropdownMenuItem onClick={() => h.openAddDialog(folder.id)}>
              <Plus size={14} className="mr-2" />
              {t("apps.bookmarks.addBookmark", "添加書籤")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => h.openRenameFolderDialog(folder)}>
              <PencilSimple size={14} className="mr-2" />
              {t("apps.bookmarks.renameFolder", "重命名")}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => h.removeFolder(folder.id)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash size={14} className="mr-2" />
              {t("apps.bookmarks.deleteFolder", "刪除分類")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1">
        {folder.bookmarks.map((bm, index) => (
          <BookmarkCard
            key={bm.id}
            bm={bm}
            onClick={() => h.openBookmark(bm.url)}
            onContextMenu={(e) => h.openContextMenu(e, bm, folder.id)}
            onLongPress={(e) => {
              // 模拟右键菜单位置
              const touch = e.touches[0];
              h.openContextMenu(
                { preventDefault: () => {}, stopPropagation: () => {}, clientX: touch.clientX, clientY: touch.clientY } as unknown as React.MouseEvent,
                bm,
                folder.id
              );
            }}
            onDragStart={(e) => h.handleDragStart(e, bm, index, folder.id)}
            onDragOver={(e) => h.handleDragOver(e, index)}
            onDragEnter={h.handleDragEnter}
            onDragLeave={h.handleDragLeave}
            onDrop={(e) => h.handleDrop(e, index, folder.id)}
            onDragEnd={h.handleDragEnd}
            isDragging={h.draggedItem?.item.id === bm.id}
            isDragOver={h.dragOverIndex === index && h.draggedItem?.folderId === folder.id}
            isMacTheme={h.currentTheme === "macosx"}
          />
        ))}
        {/* 空文件夹的拖放区域 */}
        {folder.bookmarks.length === 0 && (
          <div className="col-span-full py-4 text-center text-[10px] text-black/30">
            {isDragOverFolder ? t("apps.bookmarks.dropHere") : t("apps.bookmarks.dragHere")}
          </div>
        )}
      </div>
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
  const addDockItem = useDockStore((s) => s.addItem);
  const currentTheme = useThemeStore((s) => s.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  const isMacTheme = currentTheme === "macosx";

  // ─── 文件夹拖拽状态 ──────────────────────────────────────────────────────────
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    // 只有在拖拽书签时才允许放入文件夹
    if (h.draggedItem && !isFolder(h.draggedItem.item)) {
      setDragOverFolderId(folderId);
    }
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // 检查是否真的离开了文件夹区域
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverFolderId(null);
    }
  };

  const handleFolderDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    
    if (h.draggedItem && !isFolder(h.draggedItem.item)) {
      // 移动书签到目标文件夹
      h.handleDropToFolder(h.draggedItem.item.id, folderId);
    }
  };

  // ─── 右键菜单项 ─────────────────────────────────────────────────────────────
  const getContextMenuItems = (): MenuItem[] => {
    if (!h.contextMenu) return [];
    const { item } = h.contextMenu;

    if (isFolder(item)) {
      // 文件夹右键菜单
      return [
        {
          type: "item",
          label: t("apps.bookmarks.addBookmark", "Add Bookmark"),
          icon: "➕",
          onSelect: () => {
            h.openAddDialog(item.id);
            h.closeContextMenu();
          },
        },
        { type: "separator" },
        {
          type: "item",
          label: t("common.menu.delete", "Delete"),
          icon: "🗑️",
          onSelect: () => {
            h.removeFolder(item.id);
            h.closeContextMenu();
          },
        },
      ];
    }

    // 书签右键菜单
    return [
      {
        type: "item",
        label: t("apps.bookmarks.openInNewTab", "在新分頁中開啟"),
        onSelect: () => {
          h.openBookmark(item.url);
          h.closeContextMenu();
        },
      },
      { type: "separator" },
      {
        type: "item",
        label: t("common.menu.edit", "編輯"),
        icon: "✏️",
        onSelect: () => {
          h.openEditDialog(item);
          h.closeContextMenu();
        },
      },
      {
        type: "item",
        label: t("apps.bookmarks.addToDock", "加入 Dock"),
        icon: "📌",
        onSelect: () => {
          addDockItem({
            type: "bookmark",
            id: item.id,
          });
          h.closeContextMenu();
        },
      },
      { type: "separator" },
      {
        type: "item",
        label: t("common.menu.delete", "刪除"),
        icon: "🗑️",
        onSelect: () => {
          h.removeBookmark(item.id);
          h.closeContextMenu();
        },
      },
    ];
  };

  const menuBar = (
    <BookmarkBoardMenuBar
      onAddBookmark={() => h.openAddDialog()}
      onAddFolder={h.openFolderDialog}
      onResetBookmarks={() => h.setResetDialogOpen(true)}
      onShowHelp={() => h.setHelpOpen(true)}
      onShowAbout={() => h.setAboutOpen(true)}
      onClose={onClose}
    />
  );

  if (!isWindowOpen) return null;

  // 拆分: 顶层书签 vs 文件夹
  const topLevel = h.filteredItems.filter((i) => !isFolder(i)) as Bookmark[];
  const folders = h.filteredItems.filter(isFolder) as BookmarkFolder[];

  return (
    <>
      {/* macOS 主题：菜单栏在窗口外 */}
      {!h.isXpTheme && isForeground && menuBar}
      
      {/* 右键菜单：使用 fixed 定位容器，全局坐标 */}
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
        title={t("apps.bookmarks.name", "Bookmark Board")}
        onClose={onClose}
        isForeground={isForeground}
        appId="bookmarks"
        skipInitialSound={skipInitialSound}
        instanceId={instanceId}
        onNavigateNext={onNavigateNext}
        onNavigatePrevious={onNavigatePrevious}
        menuBar={undefined}  /* 书签板不需要窗口内菜单栏，功能都在 + 按钮里 */
      >
        <div className="flex flex-col h-full w-full bg-white/85">
          {/* ── 搜索栏 (macOS Aqua 风格) ─────────────────────── */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2",
              h.isXpTheme
                ? "border-b border-[#919b9c]"
                : h.currentTheme === "system7"
                ? "bg-gray-100 border-b border-black"
                : "border-b border-black/20"
            )}
            style={
              !h.isXpTheme && h.currentTheme !== "system7"
                ? {
                    backgroundColor: "var(--os-color-window-bg, #f5f5f5)",
                    backgroundImage: "var(--os-pinstripe-window)",
                  }
                : undefined
            }
          >
            {/* 搜索框 */}
            <div 
              className={cn(
                "flex items-center flex-1 gap-1.5 px-2.5 py-1",
                h.isXpTheme
                  ? "rounded-none border border-[#7f9db9] bg-white"
                  : h.currentTheme === "system7"
                  ? "rounded-none border border-black bg-white"
                  : "rounded-full bg-white/80 border border-black/15 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-blue-400/50 focus-within:border-blue-400/50"
              )}
            >
              <MagnifyingGlass size={14} className="text-black/40 shrink-0" />
              <input
                type="text"
                value={h.searchQuery}
                onChange={(e) => h.setSearchQuery(e.target.value)}
                placeholder={t("apps.bookmarks.search", "Search bookmarks...")}
                className="flex-1 text-[12px] bg-transparent outline-none placeholder:text-black/30"
              />
            </div>
            
            {/* + 按钮 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "w-7 h-7 flex items-center justify-center shrink-0 transition-all",
                    h.isXpTheme
                      ? "rounded-none border border-[#7f9db9] bg-[#f0f0f0] hover:bg-[#e5e5e5]"
                      : h.currentTheme === "system7"
                      ? "rounded-none border border-black bg-white hover:bg-gray-100"
                      : "rounded-full bg-white/80 border border-black/15 shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:bg-white hover:border-black/20 active:bg-black/5"
                  )}
                >
                  <Plus size={16} weight="bold" className="text-black/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                <DropdownMenuItem onClick={() => h.openAddDialog()}>
                  <Link size={14} className="mr-2" />
                  {t("apps.bookmarks.addBookmark", "新增書籤")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => h.openFolderDialog()}>
                  <FolderPlus size={14} className="mr-2" />
                  {t("apps.bookmarks.newFolder", "新增分類")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* ── 书签网格 ──────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* 顶层书签 */}
            {topLevel.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1 mb-3">
                {topLevel.map((bm, index) => (
                  <BookmarkCard
                    key={bm.id}
                    bm={bm}
                    onClick={() => h.openBookmark(bm.url)}
                    onContextMenu={(e) => h.openContextMenu(e, bm)}
                    onLongPress={(e) => {
                      // 模拟右键菜单位置
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
                    isDragOver={h.dragOverIndex === index && !h.draggedItem?.folderId}
                    isMacTheme={h.currentTheme === "macosx"}
                  />
                ))}
              </div>
            )}

            {/* 文件夹 */}
            {folders.map((folder) => (
              <FolderSection
                key={folder.id}
                folder={folder}
                h={h}
                isDragOverFolder={dragOverFolderId === folder.id}
                onFolderDragOver={(e) => handleFolderDragOver(e, folder.id)}
                onFolderDragLeave={handleFolderDragLeave}
                onFolderDrop={(e) => handleFolderDrop(e, folder.id)}
                t={t}
              />
            ))}

            {/* 空状态 */}
            {topLevel.length === 0 && folders.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-black/30 gap-2">
                <span className="text-sm font-geneva-12">
                  {h.searchQuery 
                    ? t("apps.bookmarks.noResults", "沒有結果") 
                    : t("apps.bookmarks.noBookmarksYet", "尚無書籤")}
                </span>
                {!h.searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => h.openAddDialog()}
                  >
                    {t("apps.bookmarks.addFirstBookmark", "新增第一個書籤")}
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
                className={cn(
                  "text-sm font-medium",
                  isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                )}
              >
                {t("apps.bookmarks.addBookmark", "新增書籤")}
              </DialogTitle>
            </DialogHeader>

            <div className="flex">
              {/* 左侧预览区 */}
              <div
                className="w-[100px] shrink-0 flex items-center justify-center border-r border-black/10"
                style={{
                  backgroundColor: "var(--os-color-window-bg, #f5f5f5)",
                  backgroundImage: "var(--os-pinstripe-window)",
                }}
              >
                <div className="w-16 h-16 rounded-xl bg-white/80 border border-black/10 flex items-center justify-center shadow-sm">
                  <BookmarkIconDisplay 
                    bookmark={{ 
                      id: "preview", 
                      title: h.addTitle, 
                      url: h.addUrl, 
                      icon: h.addIcon,
                      favicon: h.previewFavicon || undefined
                    }} 
                    size="lg" 
                  />
                </div>
              </div>

              {/* 右侧表单区 */}
              <DialogBody className={isXpTheme ? "flex-1 p-2 px-4" : "flex-1 p-4"}>
                <div className="space-y-3">
                  {/* URL */}
                  <div className="space-y-1">
                    <Label 
                      htmlFor="bm-url" 
                      className={cn(
                        "text-[11px] text-black/50",
                        isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial]"
                      )}
                    >
                      {t("apps.bookmarks.url", "網址")}
                    </Label>
                    <Input
                      id="bm-url"
                      value={h.addUrl}
                      onChange={(e) => h.setAddUrl(e.target.value)}
                      placeholder="https://example.com"
                      className={cn(
                        "text-xs h-8",
                        isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                      )}
                      onKeyDown={(e) => e.key === "Enter" && h.submitBookmark()}
                      autoFocus
                    />
                  </div>

                  {/* 名称 */}
                  <div className="space-y-1">
                    <Label 
                      htmlFor="bm-title" 
                      className={cn(
                        "text-[11px] text-black/50",
                        isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial]"
                      )}
                    >
                      {t("apps.bookmarks.bookmarkName", "名稱")}
                      {h.isFetchingTitle && (
                        <span className="ml-1 text-black/30">({t("common.loading", "載入中...")})</span>
                      )}
                    </Label>
                    <Input
                      id="bm-title"
                      value={h.addTitle}
                      onChange={(e) => h.setAddTitle(e.target.value)}
                      placeholder={h.isFetchingTitle ? t("apps.bookmarks.fetchingTitle", "正在取得標題...") : t("apps.bookmarks.pageTitle", "頁面標題")}
                      className={cn(
                        "text-xs h-8",
                        isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                      )}
                      onKeyDown={(e) => e.key === "Enter" && h.submitBookmark()}
                    />
                  </div>

                  {/* 图标选择器 */}
                  <div className="space-y-1">
                    <Label 
                      className={cn(
                        "text-[11px] text-black/50",
                        isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial]"
                      )}
                    >
                      {t("apps.bookmarks.icon", "圖示")}
                    </Label>
                    <IconPicker
                      url={h.addUrl}
                      value={h.addIcon}
                      onChange={h.setAddIcon}
                    />
                  </div>

                  {/* 文件夹选择 - macOS 风格 */}
                  <div className="space-y-1">
                    <Label 
                      className={cn(
                        "text-[11px] text-black/50",
                        isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial]"
                      )}
                    >
                      {t("apps.bookmarks.folder", "檔案夾")}
                    </Label>
                    <Select
                      value={h.addFolderId || "__none__"}
                      onValueChange={(v) => h.setAddFolderId(v === "__none__" ? undefined : v)}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          <span className="flex items-center gap-1.5">
                            <FolderSimple size={14} className="text-black/40" />
                            {t("apps.bookmarks.noFolder", "無檔案夾")}
                          </span>
                        </SelectItem>
                        {h.folders.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            <span className="flex items-center gap-1.5">
                              <FolderSimple size={14} weight="fill" className="text-blue-500" />
                              {f.title}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 按钮 */}
                <DialogFooter className="pt-4 gap-1">
                  <Button
                    variant={isMacTheme ? "secondary" : "retro"}
                    size="sm"
                    onClick={() => h.setAddDialogOpen(false)}
                    className={cn(
                      !isMacTheme && "h-7",
                      isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                    )}
                  >
                    {t("common.dialog.cancel", "取消")}
                  </Button>
                  <Button
                    variant={isMacTheme ? "default" : "retro"}
                    size="sm"
                    onClick={h.submitBookmark}
                    disabled={!h.addUrl.trim()}
                    className={cn(
                      !isMacTheme && "h-7",
                      isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                    )}
                  >
                    {t("apps.bookmarks.add", "新增")}
                  </Button>
                </DialogFooter>
              </DialogBody>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── 编辑书签对话框 ──────────────────────────────── */}
        <Dialog open={h.editDialogOpen} onOpenChange={h.setEditDialogOpen}>
          <DialogContent 
            className={cn("sm:max-w-[420px] p-0 gap-0 overflow-hidden", isXpTheme && "p-0")}
            style={isXpTheme ? { fontSize: "11px" } : undefined}
          >
            <DialogHeader>
              <DialogTitle 
                className={cn(
                  "text-sm font-medium",
                  isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                )}
              >
                {t("apps.bookmarks.editBookmark", "編輯書籤")}
              </DialogTitle>
            </DialogHeader>

            <div className="flex">
              {/* 左侧预览区 */}
              <div
                className="w-[100px] shrink-0 flex items-center justify-center border-r border-black/10"
                style={{
                  backgroundColor: "var(--os-color-window-bg, #f5f5f5)",
                  backgroundImage: "var(--os-pinstripe-window)",
                }}
              >
                <div className="w-16 h-16 rounded-xl bg-white/80 border border-black/10 flex items-center justify-center shadow-sm">
                  <BookmarkIconDisplay 
                    bookmark={{ 
                      id: "preview", 
                      title: h.editTitle, 
                      url: h.editUrl, 
                      icon: h.editIcon 
                    }} 
                    size="lg" 
                  />
                </div>
              </div>

              {/* 右侧表单区 */}
              <DialogBody className={isXpTheme ? "flex-1 p-2 px-4" : "flex-1 p-4"}>
                <div className="space-y-3">
                  {/* URL */}
                  <div className="space-y-1">
                    <Label 
                      htmlFor="edit-url" 
                      className={cn(
                        "text-[11px] text-black/50",
                        isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial]"
                      )}
                    >
                      {t("apps.bookmarks.url", "網址")}
                    </Label>
                    <Input
                      id="edit-url"
                      value={h.editUrl}
                      onChange={(e) => h.setEditUrl(e.target.value)}
                      placeholder="https://example.com"
                      className={cn(
                        "text-xs h-8",
                        isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                      )}
                      onKeyDown={(e) => e.key === "Enter" && h.submitEdit()}
                    />
                  </div>

                  {/* 名称 */}
                  <div className="space-y-1">
                    <Label 
                      htmlFor="edit-title" 
                      className={cn(
                        "text-[11px] text-black/50",
                        isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial]"
                      )}
                    >
                      {t("apps.bookmarks.bookmarkName", "名稱")}
                    </Label>
                    <Input
                      id="edit-title"
                      value={h.editTitle}
                      onChange={(e) => h.setEditTitle(e.target.value)}
                      placeholder={t("apps.bookmarks.pageTitle", "頁面標題")}
                      className={cn(
                        "text-xs h-8",
                        isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                      )}
                      onKeyDown={(e) => e.key === "Enter" && h.submitEdit()}
                    />
                  </div>

                  {/* 图标选择器 */}
                  <div className="space-y-1">
                    <Label 
                      className={cn(
                        "text-[11px] text-black/50",
                        isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial]"
                      )}
                    >
                      {t("apps.bookmarks.icon", "圖示")}
                    </Label>
                    <IconPicker
                      url={h.editUrl}
                      value={h.editIcon}
                      onChange={h.setEditIcon}
                    />
                  </div>

                  {/* 文件夹选择 - macOS 风格 */}
                  <div className="space-y-1">
                    <Label 
                      className={cn(
                        "text-[11px] text-black/50",
                        isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial]"
                      )}
                    >
                      {t("apps.bookmarks.folder", "檔案夾")}
                    </Label>
                    <Select
                      value={h.editFolderId || "__none__"}
                      onValueChange={(v) => h.setEditFolderId(v === "__none__" ? undefined : v)}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          <span className="flex items-center gap-1.5">
                            <FolderSimple size={14} className="text-black/40" />
                            {t("apps.bookmarks.noFolder", "無檔案夾")}
                          </span>
                        </SelectItem>
                        {h.folders.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            <span className="flex items-center gap-1.5">
                              <FolderSimple size={14} weight="fill" className="text-blue-500" />
                              {f.title}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 按钮 */}
                <DialogFooter className="pt-4 gap-1">
                  <Button
                    variant={isMacTheme ? "secondary" : "retro"}
                    size="sm"
                    onClick={() => h.setEditDialogOpen(false)}
                    className={cn(
                      !isMacTheme && "h-7",
                      isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                    )}
                  >
                    {t("common.dialog.cancel", "取消")}
                  </Button>
                  <Button 
                    variant={isMacTheme ? "default" : "retro"}
                    size="sm" 
                    onClick={h.submitEdit} 
                    disabled={!h.editUrl.trim()}
                    className={cn(
                      !isMacTheme && "h-7",
                      isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                    )}
                  >
                    {t("common.dialog.save", "儲存")}
                  </Button>
                </DialogFooter>
              </DialogBody>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── 新建文件夹对话框 ────────────────────────────── */}
        <Dialog open={h.folderDialogOpen} onOpenChange={h.setFolderDialogOpen}>
          <DialogContent 
            className={cn("sm:max-w-[320px] p-0 gap-0 overflow-hidden", isXpTheme && "p-0")}
            style={isXpTheme ? { fontSize: "11px" } : undefined}
          >
            <DialogHeader>
              <DialogTitle 
                className={cn(
                  "text-sm",
                  isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                )}
              >
                {t("apps.bookmarks.newFolder", "新增檔案夾")}
              </DialogTitle>
            </DialogHeader>
            <DialogBody className={isXpTheme ? "p-2 px-4" : "p-4"}>
              <div className="space-y-1 mb-4">
                <Label 
                  className={cn(
                    "text-[11px] text-black/50",
                    isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial]"
                  )}
                >
                  {t("apps.bookmarks.folderName", "文件夹名称")}
                </Label>
                <Input
                  value={h.folderName}
                  onChange={(e) => h.setFolderName(e.target.value)}
                  placeholder={t("apps.bookmarks.folderNamePlaceholder", "输入文件夹名称")}
                  className={cn(
                    "text-xs h-8",
                    isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                  )}
                  onKeyDown={(e) => e.key === "Enter" && h.submitFolder()}
                  autoFocus
                />
              </div>
              <DialogFooter className="gap-1">
                <Button
                  variant={isMacTheme ? "secondary" : "retro"}
                  size="sm"
                  onClick={() => h.setFolderDialogOpen(false)}
                  className={cn(
                    !isMacTheme && "h-7",
                    isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                  )}
                >
                  {t("common.dialog.cancel", "取消")}
                </Button>
                <Button 
                  variant={isMacTheme ? "default" : "retro"}
                  size="sm" 
                  onClick={h.submitFolder}
                  className={cn(
                    !isMacTheme && "h-7",
                    isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                  )}
                >
                  {t("apps.bookmarks.create", "建立")}
                </Button>
              </DialogFooter>
            </DialogBody>
          </DialogContent>
        </Dialog>

        {/* ── 重命名文件夹对话框 ──────────────────────────── */}
        <Dialog open={h.renameFolderDialogOpen} onOpenChange={h.setRenameFolderDialogOpen}>
          <DialogContent 
            className={cn("sm:max-w-[320px] p-0 gap-0 overflow-hidden", isXpTheme && "p-0")}
            style={isXpTheme ? { fontSize: "11px" } : undefined}
          >
            <DialogHeader>
              <DialogTitle 
                className={cn(
                  "text-sm",
                  isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                )}
              >
                {t("apps.bookmarks.renameFolder", "重命名")}
              </DialogTitle>
            </DialogHeader>
            <DialogBody className={isXpTheme ? "p-2 px-4" : "p-4"}>
              <div className="space-y-1 mb-4">
                <Label 
                  className={cn(
                    "text-[11px] text-black/50",
                    isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial]"
                  )}
                >
                  {t("apps.bookmarks.folderName", "文件夹名称")}
                </Label>
                <Input
                  value={h.renameFolderName}
                  onChange={(e) => h.setRenameFolderName(e.target.value)}
                  placeholder={t("apps.bookmarks.folderNamePlaceholder", "输入文件夹名称")}
                  className={cn(
                    "text-xs h-8",
                    isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                  )}
                  onKeyDown={(e) => e.key === "Enter" && h.submitRenameFolder()}
                  autoFocus
                />
              </div>
              <DialogFooter className="gap-1">
                <Button
                  variant={isMacTheme ? "secondary" : "retro"}
                  size="sm"
                  onClick={() => h.setRenameFolderDialogOpen(false)}
                  className={cn(
                    !isMacTheme && "h-7",
                    isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                  )}
                >
                  {t("common.dialog.cancel", "取消")}
                </Button>
                <Button 
                  variant={isMacTheme ? "default" : "retro"}
                  size="sm" 
                  onClick={h.submitRenameFolder}
                  disabled={!h.renameFolderName.trim()}
                  className={cn(
                    !isMacTheme && "h-7",
                    isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                  )}
                >
                  {t("common.dialog.save", "儲存")}
                </Button>
              </DialogFooter>
            </DialogBody>
          </DialogContent>
        </Dialog>

        {/* ── 系统对话框 ──────────────────────────────────── */}
        <HelpDialog
          isOpen={h.helpOpen}
          onOpenChange={h.setHelpOpen}
          helpItems={helpItems}
          appId="bookmarks"
        />
        <AboutDialog
          isOpen={h.aboutOpen}
          onOpenChange={h.setAboutOpen}
          metadata={appMetadata}
          appId="bookmarks"
        />
        <ConfirmDialog
          isOpen={h.resetDialogOpen}
          onOpenChange={h.setResetDialogOpen}
          onConfirm={h.confirmReset}
          title="Reset Bookmarks"
          description="Reset all bookmarks to defaults? This cannot be undone."
        />
      </WindowFrame>
    </>
  );
}
