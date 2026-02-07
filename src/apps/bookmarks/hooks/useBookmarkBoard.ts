/**
 * [INPUT]: useBookmarkStore, useThemeStore, react-i18next
 * [OUTPUT]: useBookmarkBoard hook
 * [POS]: bookmark-board 的全部业务逻辑，被 BookmarkBoardApp 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  useBookmarkStore,
  isFolder,
  type Bookmark,
} from "@/stores/useBookmarkStore";
import { useThemeStore } from "@/stores/useThemeStore";

// ─── 获取网页标题 ─────────────────────────────────────────────────────────────

async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    // 尝试用 allorigins 代理绕过 CORS
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
  const [isFetchingTitle, setIsFetchingTitle] = useState(false);

  // 所有文件夹列表
  const folders = useMemo(
    () => store.items.filter(isFolder).map((f) => f.title),
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

  const openAddDialog = useCallback((folderTitle?: string) => {
    setAddTitle("");
    setAddUrl("");
    setAddFolder(folderTitle);
    setAddDialogOpen(true);
  }, []);

  // 当 URL 变化时，自动获取网页标题
  useEffect(() => {
    if (!addDialogOpen || !addUrl.trim()) return;
    
    const url = addUrl.trim();
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    
    // 验证 URL 格式
    try {
      new URL(fullUrl);
    } catch {
      return;
    }

    // 如果用户已经手动输入了标题，不覆盖
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
    setAddFolder,
    openAddDialog,
    submitBookmark,
    isFetchingTitle,
    folders,
    previewFavicon,

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
