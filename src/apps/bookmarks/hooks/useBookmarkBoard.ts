/**
  * [INPUT]: useBookmarkStore, useThemeStore, useToast, getApiUrl, extractFirstUrl, useTranslation
  * [OUTPUT]: useBookmarkBoard hook
  * [POS]: bookmarks 的全部业务逻辑，被 BookmarkBoardApp 消费
  * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
  */

import { useState, useCallback, useMemo, useRef } from "react";
import {
  useBookmarkStore,
  isFolder,
  getFaviconUrl,
  openBookmarkUrl,
  type BookmarkFolder,
  type BoardItem,
} from "@/stores/useBookmarkStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { toast } from "@/hooks/useToast";
import { getApiUrl, extractFirstUrl } from "@/utils/platform";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  // ─── 搜索 ──────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return store.items;
    return store.items
      .map((item) => {
        if (isFolder(item)) {
          const matched = item.bookmarks.filter((b) => {
            const tags = (b.tags || []).join(" ").toLowerCase();
            const summary = (b.summary || "").toLowerCase();
            return (
              b.title.toLowerCase().includes(q) ||
              b.url.toLowerCase().includes(q) ||
              summary.includes(q) ||
              tags.includes(q)
            );
          });
          return matched.length ? { ...item, bookmarks: matched } : null;
        }
        const tags = (item.tags || []).join(" ").toLowerCase();
        const summary = (item.summary || "").toLowerCase();
        return item.title.toLowerCase().includes(q) ||
          item.url.toLowerCase().includes(q) ||
          summary.includes(q) ||
          tags.includes(q)
          ? item
          : null;
      })
      .filter(Boolean) as typeof store.items;
  }, [store.items, searchQuery]);

  // ─── 添加书签 ──────────────────────────────────────────────────────────────
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [isAiCreating, setIsAiCreating] = useState(false);

  // 所有文件夹列表（保留用于编辑/展示）
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

  const openAddDialog = useCallback(() => {
    setAddUrl("");
    setAddDialogOpen(true);
  }, []);

  // ─── AI 添加书签（只创建） ──────────────────────────────────────────────
  const submitAiBookmark = useCallback(async () => {
    const input = addUrl.trim();
    if (!input || isAiCreating) return;

    const rawUrl = extractFirstUrl(input) || input;
    const fullUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(fullUrl);
    } catch {
      return;
    }

    const existing = store.getBookmarkByUrl(parsedUrl.toString());
    if (existing) {
      toast(t("apps.bookmarks.linkAlreadyExists", "已存在：{{title}}", { title: existing.title }));
      return;
    }

    setIsAiCreating(true);
    try {
      const response = await fetch(getApiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a link ingestion assistant. Return JSON only: {"title":"...","summary":"...","tags":["..."]}. Summary should be two or three sentences. No extra text.`,
            },
            {
              role: "user",
              content: parsedUrl.toString(),
            },
          ],
          task: "link-ingest",
        }),
      });

      if (!response.ok) {
        return;
      }

      const text = await response.text();
      const fullContent = text
        .split("\n")
        .filter((line) => line.startsWith("0:"))
        .map((line) => {
          try {
            return JSON.parse(line.slice(2)) as string;
          } catch {
            return "";
          }
        })
        .join("");
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return;
      }
      const data = JSON.parse(jsonMatch[0]) as { title: string; summary: string; tags: string[] };

      if (!data.title || !data.summary || !Array.isArray(data.tags)) {
        return;
      }

      const trimmedTags = data.tags.filter((tag) => tag && tag.trim());
      store.addAiBookmark(data.title, parsedUrl.toString(), data.summary, trimmedTags);
      setAddDialogOpen(false);
      setAddUrl("");
    } catch {
      // noop
    } finally {
      setIsAiCreating(false);
    }
  }, [addUrl, isAiCreating, store, t]);

  // ─── 编辑书签 ──────────────────────────────────────────────────────────────

  // ─── 打开书签 ──────────────────────────────────────────────────────────────

  const openBookmark = useCallback((url: string) => {
    openBookmarkUrl(url);
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
    addUrl,
    setAddUrl,
    openAddDialog,
    submitAiBookmark,
    isAiCreating,
    folders,
    previewFavicon,

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
