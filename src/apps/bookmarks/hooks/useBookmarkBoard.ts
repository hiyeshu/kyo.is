/**
 * [INPUT]: useBookmarkStore, useThemeStore
 * [OUTPUT]: useBookmarkBoard hook
 * [POS]: bookmark-board 的全部业务逻辑，被 BookmarkBoardApp 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  useBookmarkStore,
  isFolder,
  getFaviconUrl,
  type Bookmark,
  type BookmarkFolder,
  type BoardItem,
  type BookmarkIcon,
} from "@/stores/useBookmarkStore";
import { useThemeStore } from "@/stores/useThemeStore";

// ─── 获取网页标题 ─────────────────────────────────────────────────────────────

async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    
    const html = await res.text();
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

// ─── 右键菜单类型 ─────────────────────────────────────────────────────────────

export interface ContextMenuState {
  x: number;
  y: number;
  item: BoardItem;
  folderId?: string; // 如果书签在文件夹内
}

export function useBookmarkBoard() {
  const store = useBookmarkStore();
  const currentTheme = useThemeStore((s) => s.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

  // ─── 搜索 ──────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return store.items;
    return store.items
      .map((item) => {
        if (isFolder(item)) {
          const matched = item.bookmarks.filter(
            (b) =>
              b.title.toLowerCase().includes(q) ||
              b.url.toLowerCase().includes(q)
          );
          return matched.length ? { ...item, bookmarks: matched } : null;
        }
        return item.title.toLowerCase().includes(q) ||
          item.url.toLowerCase().includes(q)
          ? item
          : null;
      })
      .filter(Boolean) as typeof store.items;
  }, [store.items, searchQuery]);

  // ─── 添加书签 ──────────────────────────────────────────────────────────────
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addFolderId, setAddFolderId] = useState<string | undefined>(undefined);
  const [isFetchingTitle, setIsFetchingTitle] = useState(false);

  // 所有文件夹列表
  const folders = useMemo(
    () => store.items.filter(isFolder) as BookmarkFolder[],
    [store.items]
  );

  // 预览 favicon URL - 根据用户地区自动选择服务
  const previewFavicon = useMemo(() => {
    const url = addUrl.trim();
    if (!url) return null;
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    try {
      const hostname = new URL(fullUrl).hostname;
      return getFaviconUrl(hostname);
    } catch {
      return null;
    }
  }, [addUrl]);

  const openAddDialog = useCallback((folderId?: string) => {
    setAddTitle("");
    setAddUrl("");
    setAddFolderId(folderId);
    setAddDialogOpen(true);
  }, []);

  // 当 URL 变化时，自动获取网页标题
  useEffect(() => {
    if (!addDialogOpen || !addUrl.trim()) return;
    
    const url = addUrl.trim();
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    
    try {
      new URL(fullUrl);
    } catch {
      return;
    }

    if (addTitle.trim()) return;

    const controller = new AbortController();
    setIsFetchingTitle(true);

    fetchPageTitle(fullUrl)
      .then((title) => {
        if (!controller.signal.aborted && title) {
          setAddTitle(title);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsFetchingTitle(false);
        }
      });

    return () => controller.abort();
  }, [addUrl, addDialogOpen, addTitle]);

  const submitBookmark = useCallback(() => {
    const url = addUrl.trim();
    const title = addTitle.trim();
    if (!url) return;

    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    let hostname = "example.com";
    try {
      hostname = new URL(fullUrl).hostname;
    } catch { /* noop */ }

    const finalTitle = title || hostname;
    // 根据用户地区自动选择 favicon 服务
    const favicon = getFaviconUrl(hostname);

    store.addBookmark(finalTitle, fullUrl, favicon, addFolderId);
    setAddDialogOpen(false);
  }, [addUrl, addTitle, addFolderId, store]);

  // ─── 编辑书签 ──────────────────────────────────────────────────────────────
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editIcon, setEditIcon] = useState<BookmarkIcon | undefined>(undefined);

  const openEditDialog = useCallback((bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setEditTitle(bookmark.title);
    setEditUrl(bookmark.url);
    // 初始化图标状态
    setEditIcon(bookmark.icon || { type: "favicon", value: bookmark.favicon || "" });
    setEditDialogOpen(true);
  }, []);

  const submitEdit = useCallback(() => {
    if (!editingBookmark) return;
    
    const url = editUrl.trim();
    const title = editTitle.trim();
    if (!url) return;

    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    let hostname = "example.com";
    try {
      hostname = new URL(fullUrl).hostname;
    } catch { /* noop */ }

    store.updateBookmark(editingBookmark.id, {
      title: title || hostname,
      url: fullUrl,
      // 保存新的图标配置
      icon: editIcon,
      // 兼容旧版：同时更新 favicon 字段
      favicon: editIcon?.type === "favicon" ? getFaviconUrl(hostname) : editingBookmark.favicon,
    });
    
    setEditDialogOpen(false);
    setEditingBookmark(null);
  }, [editingBookmark, editTitle, editUrl, editIcon, store]);

  // ─── 打开书签 ──────────────────────────────────────────────────────────────
  const openBookmark = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  // ─── 删除 ──────────────────────────────────────────────────────────────────
  const removeBookmark = useCallback((id: string) => {
    store.removeBookmark(id);
  }, [store]);

  const removeFolder = useCallback((id: string) => {
    store.removeFolder(id);
  }, [store]);

  // ─── 右键菜单 ──────────────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const openContextMenu = useCallback((e: React.MouseEvent, item: BoardItem, folderId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item, folderId });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // ─── 拖拽排序 ──────────────────────────────────────────────────────────────
  const [draggedItem, setDraggedItem] = useState<{ item: BoardItem; index: number; folderId?: string } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounterRef = useRef(0);

  const handleDragStart = useCallback((e: React.DragEvent, item: BoardItem, index: number, folderId?: string) => {
    setDraggedItem({ item, index, folderId });
    e.dataTransfer.effectAllowed = "copyMove";
    e.dataTransfer.setData("text/plain", item.id);
    
    // 设置 JSON 数据，让 Dock 能识别这是书签拖拽
    if (!isFolder(item)) {
      e.dataTransfer.setData("application/json", JSON.stringify({
        type: "bookmark",
        bookmarkId: item.id,
      }));
    }
    
    // 设置拖拽图像
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 24, 24);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setDragOverIndex(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number, targetFolderId?: string) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragOverIndex(null);

    if (!draggedItem) return;

    const { item, index: fromIndex, folderId: sourceFolderId } = draggedItem;

    // 同一层级内排序
    if (sourceFolderId === targetFolderId) {
      if (fromIndex !== toIndex) {
        if (sourceFolderId) {
          store.reorderInFolder(sourceFolderId, fromIndex, toIndex);
        } else {
          store.reorderItems(fromIndex, toIndex);
        }
      }
    } else {
      // 跨文件夹移动（只对书签有效）
      if (!isFolder(item)) {
        store.moveBookmarkToFolder(item.id, targetFolderId || null);
      }
    }

    setDraggedItem(null);
  }, [draggedItem, store]);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverIndex(null);
    dragCounterRef.current = 0;
  }, []);

  // 直接拖放到文件夹
  const handleDropToFolder = useCallback((bookmarkId: string, targetFolderId: string | null) => {
    store.moveBookmarkToFolder(bookmarkId, targetFolderId);
    setDraggedItem(null);
    setDragOverIndex(null);
    dragCounterRef.current = 0;
  }, [store]);

  // ─── 重置 ──────────────────────────────────────────────────────────────────
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const confirmReset = useCallback(() => {
    store.resetToDefaults();
    setResetDialogOpen(false);
  }, [store]);

  // ─── 添加文件夹 ────────────────────────────────────────────────────────────
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");

  const openFolderDialog = useCallback(() => {
    setFolderName("");
    setFolderDialogOpen(true);
  }, []);

  const submitFolder = useCallback(() => {
    const name = folderName.trim();
    if (!name) return;
    store.addFolder(name);
    setFolderDialogOpen(false);
  }, [folderName, store]);

  // ─── 重命名文件夹 ──────────────────────────────────────────────────────────
  const [renameFolderDialogOpen, setRenameFolderDialogOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<BookmarkFolder | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");

  const openRenameFolderDialog = useCallback((folder: BookmarkFolder) => {
    setRenamingFolder(folder);
    setRenameFolderName(folder.title);
    setRenameFolderDialogOpen(true);
  }, []);

  const submitRenameFolder = useCallback(() => {
    if (!renamingFolder) return;
    const name = renameFolderName.trim();
    if (!name) return;
    store.renameFolder(renamingFolder.id, name);
    setRenameFolderDialogOpen(false);
    setRenamingFolder(null);
  }, [renamingFolder, renameFolderName, store]);

  // ─── Help / About ──────────────────────────────────────────────────────────
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  return {
    // 数据
    items: store.items,
    filteredItems,
    searchQuery,
    setSearchQuery,

    // 主题
    currentTheme,
    isXpTheme,

    // 添加书签
    addDialogOpen,
    setAddDialogOpen,
    addTitle,
    setAddTitle,
    addUrl,
    setAddUrl,
    addFolderId,
    setAddFolderId,
    openAddDialog,
    submitBookmark,
    isFetchingTitle,
    folders,
    previewFavicon,

    // 编辑书签
    editDialogOpen,
    setEditDialogOpen,
    editingBookmark,
    editTitle,
    setEditTitle,
    editUrl,
    setEditUrl,
    editIcon,
    setEditIcon,
    openEditDialog,
    submitEdit,

    // 打开
    openBookmark,

    // 删除
    removeBookmark,
    removeFolder,

    // 右键菜单
    contextMenu,
    openContextMenu,
    closeContextMenu,

    // 拖拽排序
    draggedItem,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    handleDropToFolder,

    // 重置
    resetDialogOpen,
    setResetDialogOpen,
    confirmReset,

    // 添加文件夹
    folderDialogOpen,
    setFolderDialogOpen,
    folderName,
    setFolderName,
    openFolderDialog,
    submitFolder,

    // 重命名文件夹
    renameFolderDialogOpen,
    setRenameFolderDialogOpen,
    renamingFolder,
    renameFolderName,
    setRenameFolderName,
    openRenameFolderDialog,
    submitRenameFolder,

    // Help / About
    helpOpen,
    setHelpOpen,
    aboutOpen,
    setAboutOpen,
  };
}
