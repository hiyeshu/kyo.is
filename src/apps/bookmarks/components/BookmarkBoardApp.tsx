/**
 * [INPUT]: 依赖 components/layout/WindowFrame, components/ui, hooks/useBookmarkBoard, stores/useBookmarkStore
 * [OUTPUT]: 对外提供 BookmarkBoardApp 组件
 * [POS]: apps/bookmarks/components/ 的根组件，书签应用主容器
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useRef } from "react";
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
      className={`flex flex-col items-center gap-1 p-2 rounded-lg cursor-pointer group relative transition-all
        ${isDragging ? "opacity-50 scale-95" : "hover:bg-black/5"}
        ${isDragOver ? "ring-2 ring-blue-500 ring-offset-1" : ""}
      `}
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
      <div className="w-10 h-10 rounded-lg bg-white/80 border border-black/10 flex items-center justify-center shadow-sm">
        <BookmarkIconDisplay bookmark={bm} size="sm" />
      </div>
      <span className="text-[10px] text-center truncate w-full font-geneva-12 leading-tight opacity-80">
        {bm.title}
      </span>
    </div>
  );
}

// ─── 文件夹区域 ──────────────────────────────────────────────────────────────

function FolderSection({
  folder,
  h,
}: {
  folder: BookmarkFolder;
  h: ReturnType<typeof useBookmarkBoard>;
}) {
  return (
    <div className="mb-3">
      <div 
        className="flex items-center gap-1.5 mb-1.5 px-1 group/folder"
        onContextMenu={(e) => h.openContextMenu(e, folder)}
      >
        <span className="text-[10px] font-geneva-12 font-medium text-black/40 uppercase tracking-wider cursor-default">
          {folder.title}
        </span>
        <div className="flex-1 h-px bg-black/8" />
        <button
          className="text-[10px] text-black/30 hover:text-black/60 opacity-0 group-hover/folder:opacity-100 transition-opacity"
          onClick={() => h.openAddDialog(folder.id)}
          title="Add to folder"
        >
          <Plus size={10} weight="bold" />
        </button>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-1">
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
          />
        ))}
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

  // ─── 右键菜单项 ─────────────────────────────────────────────────────────────
  const getContextMenuItems = (): MenuItem[] => {
    if (!h.contextMenu) return [];
    const { item } = h.contextMenu;

    if (isFolder(item)) {
      // 文件夹右键菜单
      return [
        {
          type: "item",
          label: t("bookmarks.addBookmark", "Add Bookmark"),
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
        menuBar={h.isXpTheme ? menuBar : undefined}
      >
        <div className="flex flex-col h-full w-full">
          {/* ── 搜索栏 ────────────────────────────────────── */}
          <div
            className={`flex items-center px-2 py-1.5 ${
              h.isXpTheme
                ? "border-b border-[#919b9c]"
                : h.currentTheme === "system7"
                ? "bg-gray-100 border-b border-black"
                : "border-b border-black/10"
            }`}
          >
            <div className="flex items-center flex-1 gap-1 px-1.5 py-0.5 rounded bg-black/[0.03]">
              <MagnifyingGlass size={12} className="text-black/30 shrink-0" />
              <Input
                value={h.searchQuery}
                onChange={(e) => h.setSearchQuery(e.target.value)}
                placeholder={t("apps.bookmarks.search", "Search bookmarks...")}
                className="flex-1 !text-[11px] border-none shadow-none bg-transparent focus-visible:ring-0 h-5 px-0"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 ml-1"
              onClick={() => h.openAddDialog()}
            >
              <Plus size={14} />
            </Button>
          </div>

          {/* ── 书签网格 ──────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* 顶层书签 */}
            {topLevel.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-1 mb-3">
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
            <div className="flex">
              {/* 左侧预览区 */}
              <div
                className="w-[120px] shrink-0 flex items-center justify-center border-r border-black/10"
                style={{
                  backgroundColor: "var(--os-color-window-bg, #f5f5f5)",
                  backgroundImage: "var(--os-pinstripe-window)",
                }}
              >
                <div className="w-16 h-16 rounded-xl bg-white/80 border border-black/10 flex items-center justify-center shadow-sm">
                  {h.previewFavicon ? (
                    <img
                      src={h.previewFavicon}
                      alt=""
                      className="w-8 h-8 object-contain"
                      style={{ imageRendering: "-webkit-optimize-contrast" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-2xl opacity-30">🌐</span>
                  )}
                </div>
              </div>

              {/* 右侧表单区 */}
              <div className={isXpTheme ? "flex-1 p-2 px-4" : "flex-1 p-4"}>
                <DialogHeader className="pb-3">
                  <DialogTitle 
                    className={cn(
                      "text-sm font-medium",
                      isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                    )}
                  >
                    {t("apps.bookmarks.addBookmark", "新增書籤")}
                  </DialogTitle>
                </DialogHeader>

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

                  {/* 文件夹选择 */}
                  <div className="space-y-1">
                    <Label 
                      htmlFor="bm-folder" 
                      className={cn(
                        "text-[11px] text-black/50",
                        isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial]"
                      )}
                    >
                      {t("apps.bookmarks.folder", "檔案夾")}
                    </Label>
                    <select
                      id="bm-folder"
                      value={h.addFolderId || ""}
                      onChange={(e) => h.setAddFolderId(e.target.value || undefined)}
                      className={cn(
                        "w-full h-8 px-2 text-xs rounded border border-black/20 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30",
                        isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                      )}
                    >
                      <option value="">{t("apps.bookmarks.noFolder", "無檔案夾")}</option>
                      {h.folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.title}
                        </option>
                      ))}
                    </select>
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
              </div>
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
              <div className={isXpTheme ? "flex-1 p-2 px-4" : "flex-1 p-4"}>
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
                  {/* Name */}
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
                  {/* Icon Picker */}
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
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── 新建文件夹对话框 ────────────────────────────── */}
        <Dialog open={h.folderDialogOpen} onOpenChange={h.setFolderDialogOpen}>
          <DialogContent 
            className={cn("sm:max-w-[320px]", isXpTheme && "p-0 overflow-hidden")}
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
            <div className={isXpTheme ? "p-2 px-4" : "py-2"}>
              <Input
                value={h.folderName}
                onChange={(e) => h.setFolderName(e.target.value)}
                placeholder={t("apps.bookmarks.folderName", "檔案夾名稱")}
                className={cn(
                  "text-xs",
                  isXpTheme && "font-['Pixelated_MS_Sans_Serif',Arial] text-[11px]"
                )}
                onKeyDown={(e) => e.key === "Enter" && h.submitFolder()}
                autoFocus
              />
            </div>
            <DialogFooter className={isXpTheme ? "p-2 px-4 pt-0 gap-1" : "gap-1"}>
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
