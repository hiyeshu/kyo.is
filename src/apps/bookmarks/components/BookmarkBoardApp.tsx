/**
 * [INPUT]: 依赖 components/layout/WindowFrame 的窗口框架，依赖 components/ui 的 UI 组件，依赖 hooks/useBookmarkBoard 的书签管理逻辑，依赖 stores/useBookmarkStore 的书签状态
 * [OUTPUT]: 对外提供 BookmarkBoardApp 组件，书签应用主界面（书签网格、搜索、添加、编辑、删除、文件夹管理）
 * [POS]: apps/bookmarks/components/ 的根组件，被 appRegistry 注册和加载，是书签应用的主容器
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
import { MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { appMetadata, helpItems } from "../metadata";
import { BookmarkBoardMenuBar } from "./BookmarkBoardMenuBar";
import { useBookmarkBoard } from "../hooks/useBookmarkBoard";
import { isFolder, type Bookmark, type BookmarkFolder } from "@/stores/useBookmarkStore";

// ─── 书签卡片 ────────────────────────────────────────────────────────────────

function BookmarkCard({
  bm,
  onClick,
  onRemove,
}: {
  bm: Bookmark;
  onClick: () => void;
  onRemove?: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-black/5 cursor-pointer group relative transition-colors"
      onClick={onClick}
      title={bm.url}
    >
      {onRemove && (
        <button
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neutral-400/80 text-white text-[10px] leading-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X size={8} weight="bold" />
        </button>
      )}
      <div className="w-10 h-10 rounded-lg bg-white/80 border border-black/10 flex items-center justify-center shadow-sm">
        {bm.favicon ? (
          <img
            src={bm.favicon}
            alt=""
            className="w-5 h-5"
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
  onOpen,
  onRemoveBookmark,
  onRemoveFolder,
  onAddToFolder,
}: {
  folder: BookmarkFolder;
  onOpen: (url: string) => void;
  onRemoveBookmark: (url: string, folderTitle: string) => void;
  onRemoveFolder: (title: string) => void;
  onAddToFolder: (folderTitle: string) => void;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 mb-1.5 px-1 group/folder">
        <span className="text-[10px] font-geneva-12 font-medium text-black/40 uppercase tracking-wider">
          {folder.title}
        </span>
        <div className="flex-1 h-px bg-black/8" />
        <button
          className="text-[10px] text-black/30 hover:text-black/60 opacity-0 group-hover/folder:opacity-100 transition-opacity"
          onClick={() => onAddToFolder(folder.title)}
          title="Add to folder"
        >
          <Plus size={10} weight="bold" />
        </button>
        <button
          className="text-[10px] text-black/30 hover:text-red-500 opacity-0 group-hover/folder:opacity-100 transition-opacity"
          onClick={() => onRemoveFolder(folder.title)}
          title="Delete folder"
        >
          <X size={10} weight="bold" />
        </button>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-1">
        {folder.bookmarks.map((bm) => (
          <BookmarkCard
            key={bm.url}
            bm={bm}
            onClick={() => onOpen(bm.url)}
            onRemove={() => onRemoveBookmark(bm.url, folder.title)}
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
}: AppProps) {
  const h = useBookmarkBoard();

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
                {topLevel.map((bm) => (
                  <BookmarkCard
                    key={bm.url}
                    bm={bm}
                    onClick={() => h.openBookmark(bm.url)}
                    onRemove={() => h.removeBookmark(bm.url)}
                  />
                ))}
              </div>
            )}

            {/* 文件夹 */}
            {folders.map((folder) => (
              <FolderSection
                key={folder.title}
                folder={folder}
                onOpen={h.openBookmark}
                onRemoveBookmark={h.removeBookmark}
                onRemoveFolder={h.removeFolder}
                onAddToFolder={(t) => h.openAddDialog(t)}
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
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle className="text-sm">
                Add Bookmark{h.addFolder ? ` to "${h.addFolder}"` : ""}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="bm-url" className="text-xs">
                  URL
                </Label>
                <Input
                  id="bm-url"
                  value={h.addUrl}
                  onChange={(e) => h.setAddUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="text-xs"
                  onKeyDown={(e) => e.key === "Enter" && h.submitBookmark()}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bm-title" className="text-xs">
                  Title (optional)
                </Label>
                <Input
                  id="bm-title"
                  value={h.addTitle}
                  onChange={(e) => h.setAddTitle(e.target.value)}
                  placeholder="My Bookmark"
                  className="text-xs"
                  onKeyDown={(e) => e.key === "Enter" && h.submitBookmark()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => h.setAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={h.submitBookmark}>
                Add
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
