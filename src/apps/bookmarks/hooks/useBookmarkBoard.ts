/**
 * [INPUT]: useBookmarkStore, useThemeStore, react-i18next
 * [OUTPUT]: useBookmarkBoard hook
 * [POS]: bookmark-board 的全部业务逻辑，被 BookmarkBoardApp 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback, useMemo } from "react";
import {
  useBookmarkStore,
  DEFAULT_ITEMS,
  isFolder,
  type Bookmark,
} from "@/stores/useBookmarkStore";
import { useThemeStore } from "@/stores/useThemeStore";

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
  const [addFolder, setAddFolder] = useState<string | undefined>(undefined);

  const openAddDialog = useCallback((folderTitle?: string) => {
    setAddTitle("");
    setAddUrl("");
    setAddFolder(folderTitle);
    setAddDialogOpen(true);
  }, []);

  const submitBookmark = useCallback(() => {
    const url = addUrl.trim();
    const title = addTitle.trim();
    if (!url) return;

    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    let hostname = "example.com";
    try {
      hostname = new URL(fullUrl).hostname;
    } catch { /* noop */ }

    const bm: Bookmark = {
      title: title || hostname,
      url: fullUrl,
      favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
    };

    store.addBookmark(bm, addFolder);
    setAddDialogOpen(false);
  }, [addUrl, addTitle, addFolder, store]);

  // ─── 打开书签 ──────────────────────────────────────────────────────────────
  const openBookmark = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
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
    addFolder,
    openAddDialog,
    submitBookmark,

    // 打开
    openBookmark,

    // 删除
    removeBookmark: store.removeBookmark,
    removeFolder: store.removeFolder,

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
