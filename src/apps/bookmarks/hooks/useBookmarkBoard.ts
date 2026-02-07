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
  type Bookmark,
  type BookmarkFolder,
  type BoardItem,
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

  // 预览 favicon URL
  const previewFavicon = useMemo(() => {
    const url = addUrl.trim();
    if (!url) return null;
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    try {
      const hostname = new URL(fullUrl).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
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
    const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

    store.addBookmark(finalTitle, fullUrl, favicon, addFolderId);
    setAddDialogOpen(false);
  }, [addUrl, addTitle, addFolderId, store]);

  // ─── 编辑书签 ──────────────────────────────────────────────────────────────
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const openEditDialog = useCallback((bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setEditTitle(bookmark.title);
    setEditUrl(bookmark.url);
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
      favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
    });
    
    setEditDialogOpen(false);
    setEditingBookmark(null);
  }, [editingBookmark, editTitle, editUrl, store]);

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
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
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

    // 重置
    resetDialogOpen,
    setResetDialogOpen,
    confirmReset,

    // 文件夹
    folderDialogOpen,
    setFolderDialogOpen,
    folderName,
    setFolderName,
    openFolderDialog,
    submitFolder,

    // Help / About
    helpOpen,
    setHelpOpen,
    aboutOpen,
    setAboutOpen,
  };
}
