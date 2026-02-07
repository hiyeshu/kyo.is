/**
 * [INPUT]: 依赖 components/layout/WindowFrame, components/ui, hooks/useBookmarkBoard, stores/useBookmarkStore
 * [OUTPUT]: 对外提供 BookmarkBoardApp 组件
 * [POS]: apps/bookmarks/components/ 的根组件，书签应用主容器
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

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
import { useDockStore } from "@/stores/useDockStore";
import { useTranslation } from "react-i18next";

// ─── 书签卡片 ────────────────────────────────────────────────────────────────

function BookmarkCard({
  bm,
  onClick,
  onContextMenu,
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
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 p-2 rounded-lg cursor-pointer group relative transition-all
        ${isDragging ? "opacity-50 scale-95" : "hover:bg-black/5"}
        ${isDragOver ? "ring-2 ring-blue-500 ring-offset-1" : ""}
      `}
      onClick={onClick}
      onContextMenu={onContextMenu}
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
        {bm.favicon ? (
          <img
            src={bm.favicon}
            alt=""
            className="w-5 h-5"
            draggable={false}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-lg">🌐</span>
        )}
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
        label: t("bookmarks.openInNewTab", "Open in New Tab"),
        onSelect: () => {
          h.openBookmark(item.url);
          h.closeContextMenu();
        },
      },
      { type: "separator" },
      {
        type: "item",
        label: t("common.menu.edit", "Edit"),
        icon: "✏️",
        onSelect: () => {
          h.openEditDialog(item);
          h.closeContextMenu();
        },
      },
      {
        type: "item",
        label: t("bookmarks.addToDock", "Add to Dock"),
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
        label: t("common.menu.delete", "Delete"),
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
        title="Bookmark Board"
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
            className={`flex items-center gap-2 px-3 py-1.5 ${
              h.isXpTheme
                ? "border-b border-[#919b9c]"
                : h.currentTheme === "system7"
                ? "bg-gray-100 border-b border-black"
                : "border-b border-black/10"
            }`}
          >
            <MagnifyingGlass size={13} className="text-black/30 shrink-0" />
            <Input
              value={h.searchQuery}
              onChange={(e) => h.setSearchQuery(e.target.value)}
              placeholder="Search bookmarks..."
              className="flex-1 !text-[11px] border-none shadow-none bg-transparent focus-visible:ring-0 h-6 px-0"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => h.openAddDialog()}
              title="Add bookmark"
            >
              <Plus size={13} />
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
                  {h.searchQuery ? "No results" : "No bookmarks yet"}
                </span>
                {!h.searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => h.openAddDialog()}
                  >
                    Add your first bookmark
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 添加书签对话框 ──────────────────────────────── */}
        <Dialog open={h.addDialogOpen} onOpenChange={h.setAddDialogOpen}>
          <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden">
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
                      className="w-8 h-8"
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
              <div className="flex-1 p-4">
                <DialogHeader className="pb-3">
                  <DialogTitle className="text-sm font-medium">
                    Add Bookmark
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                  {/* URL */}
                  <div className="space-y-1">
                    <Label htmlFor="bm-url" className="text-[11px] text-black/50">
                      URL
                    </Label>
                    <Input
                      id="bm-url"
                      value={h.addUrl}
                      onChange={(e) => h.setAddUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="text-xs h-8"
                      onKeyDown={(e) => e.key === "Enter" && h.submitBookmark()}
                      autoFocus
                    />
                  </div>

                  {/* 名称 */}
                  <div className="space-y-1">
                    <Label htmlFor="bm-title" className="text-[11px] text-black/50">
                      Name
                      {h.isFetchingTitle && (
                        <span className="ml-1 text-black/30">(loading...)</span>
                      )}
                    </Label>
                    <Input
                      id="bm-title"
                      value={h.addTitle}
                      onChange={(e) => h.setAddTitle(e.target.value)}
                      placeholder={h.isFetchingTitle ? "Fetching title..." : "Page title"}
                      className="text-xs h-8"
                      onKeyDown={(e) => e.key === "Enter" && h.submitBookmark()}
                    />
                  </div>

                  {/* 文件夹选择 */}
                  <div className="space-y-1">
                    <Label htmlFor="bm-folder" className="text-[11px] text-black/50">
                      Folder
                    </Label>
                    <select
                      id="bm-folder"
                      value={h.addFolderId || ""}
                      onChange={(e) => h.setAddFolderId(e.target.value || undefined)}
                      className="w-full h-8 px-2 text-xs rounded border border-black/20 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      <option value="">No folder</option>
                      {h.folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 按钮 */}
                <DialogFooter className="pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => h.setAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={h.submitBookmark}
                    disabled={!h.addUrl.trim()}
                  >
                    Add
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── 编辑书签对话框 ──────────────────────────────── */}
        <Dialog open={h.editDialogOpen} onOpenChange={h.setEditDialogOpen}>
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader>
              <DialogTitle className="text-sm">Edit Bookmark</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="edit-url" className="text-[11px] text-black/50">
                  URL
                </Label>
                <Input
                  id="edit-url"
                  value={h.editUrl}
                  onChange={(e) => h.setEditUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="text-xs h-8"
                  onKeyDown={(e) => e.key === "Enter" && h.submitEdit()}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-title" className="text-[11px] text-black/50">
                  Name
                </Label>
                <Input
                  id="edit-title"
                  value={h.editTitle}
                  onChange={(e) => h.setEditTitle(e.target.value)}
                  placeholder="Page title"
                  className="text-xs h-8"
                  onKeyDown={(e) => e.key === "Enter" && h.submitEdit()}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => h.setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={h.submitEdit} disabled={!h.editUrl.trim()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── 新建文件夹对话框 ────────────────────────────── */}
        <Dialog open={h.folderDialogOpen} onOpenChange={h.setFolderDialogOpen}>
          <DialogContent className="sm:max-w-[320px]">
            <DialogHeader>
              <DialogTitle className="text-sm">New Folder</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <Input
                value={h.folderName}
                onChange={(e) => h.setFolderName(e.target.value)}
                placeholder="Folder name"
                className="text-xs"
                onKeyDown={(e) => e.key === "Enter" && h.submitFolder()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => h.setFolderDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={h.submitFolder}>
                Create
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
