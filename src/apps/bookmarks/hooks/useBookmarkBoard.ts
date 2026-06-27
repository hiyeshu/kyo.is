/**
  * [INPUT]: useBookmarkStore, useThemeStore, useLinkMetaStore, useToast, getApiUrl, extractFirstUrl, useTranslation
  * [OUTPUT]: useBookmarkBoard hook
  * [POS]: bookmarks 的全部业务逻辑，被 BookmarkBoardApp 消费，manual 排序以 orderIndex 为真相源
  * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
  */

import { useState, useCallback, useMemo, useRef } from "react";
import {
  useBookmarkStore,
  getFaviconUrl,
  openBookmarkUrl,
  type Bookmark,
} from "@/stores/useBookmarkStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useLinkMetaStore } from "@/stores/useLinkMetaStore";
import { toast } from "@/hooks/useToast";
import { getApiUrl, extractFirstUrl } from "@/utils/platform";
import type { LinkMeta } from "@/types/kyoItem";
import { useTranslation } from "react-i18next";

// ─── 右键菜单类型 ─────────────────────────────────────────────────────────────

export type ContextMenuTarget =
  | { kind: "bookmark"; item: Bookmark }
  | { kind: "empty" };

export interface ContextMenuState {
  x: number;
  y: number;
  target: ContextMenuTarget;
}

export function useBookmarkBoard() {
  const store = useBookmarkStore();
  const currentTheme = useThemeStore((s) => s.current);
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  const { t, i18n } = useTranslation();

  // ─── 搜索 ──────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return store.items;
    return store.items.filter((bm) => {
      const tags = (bm.tags || []).join(" ").toLowerCase();
      const summary = (bm.summary || "").toLowerCase();
      return (
        bm.title.toLowerCase().includes(q) ||
        bm.url.toLowerCase().includes(q) ||
        summary.includes(q) ||
        tags.includes(q)
      );
    });
  }, [store.items, searchQuery]);

  // ─── 排序后的列表 ──────────────────────────────────────────────────────────
  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    if (store.sortMode === "manual") {
      list.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    } else if (store.sortMode === "name") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      // "recent": lastUsed 优先，没有 lastUsed 的按 createdAt 降序
      list.sort((a, b) => {
        const aTime = a.lastUsed || a.createdAt || "";
        const bTime = b.lastUsed || b.createdAt || "";
        return bTime.localeCompare(aTime);
      });
    }
    return list;
  }, [filteredItems, store.sortMode]);

  // ─── 域名分组 ──────────────────────────────────────────────────────────────
  const groupedByDomain = useMemo(() => {
    if (!store.groupByDomain) return null;
    const raw = new Map<string, Bookmark[]>();
    for (const bm of sortedItems) {
      let domain = "other";
      try { domain = new URL(bm.url).hostname.replace(/^www\./, ""); } catch { /* noop */ }
      const list = raw.get(domain) || [];
      list.push(bm);
      raw.set(domain, list);
    }
    // 单个书签的域名归入"其他"，避免一个域名独占一行
    const result: [string, Bookmark[]][] = [];
    const others: Bookmark[] = [];
    for (const [domain, bookmarks] of raw) {
      if (bookmarks.length >= 2) {
        result.push([domain, bookmarks]);
      } else {
        others.push(...bookmarks);
      }
    }
    result.sort(([a], [b]) => a.localeCompare(b));
    if (others.length > 0) result.push(["other", others]);
    return result;
  }, [sortedItems, store.groupByDomain]);

  // ─── 添加书签 ──────────────────────────────────────────────────────────────
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [isAiCreating, setIsAiCreating] = useState(false);

  const previewFavicon = useMemo(() => {
    const url = addUrl.trim();
    if (!url) return null;
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    try { return getFaviconUrl(new URL(fullUrl).hostname); } catch { return null; }
  }, [addUrl]);

  const openAddDialog = useCallback(() => {
    setAddUrl("");
    setAddDialogOpen(true);
  }, []);

  // ─── AI 添加书签（异步渐进模式）────────────────────────────────────────────
  const submitAiBookmark = useCallback(async () => {
    const input = addUrl.trim();
    if (!input || isAiCreating) return;

    const rawUrl = extractFirstUrl(input) || input;
    const fullUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

    let parsedUrl: URL | null = null;
    try { parsedUrl = new URL(fullUrl); } catch { return; }

    const existing = store.getBookmarkByUrl(parsedUrl.toString());
    if (existing) {
      toast(t("apps.bookmarks.linkAlreadyExists", "已存在：{{title}}", { title: existing.title }));
      return;
    }

    // ── Phase 1: 立即创建占位书签，关闭对话框 ──
    const fallbackTitle = parsedUrl.hostname.replace(/^www\./, "");
    let hostname = "example.com";
    try { hostname = new URL(parsedUrl.toString()).hostname; } catch { /* noop */ }
    const favicon = getFaviconUrl(hostname);
    
    const bookmarkId = store.addBookmark(fallbackTitle, parsedUrl.toString(), favicon);
    setAddDialogOpen(false);
    setAddUrl("");

    // ── Phase 2: 后台异步获取链接元数据并更新 ──
    setIsAiCreating(true);
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 15_000);
    try {
      const response = await fetch(getApiUrl("/api/scrape"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({
          url: parsedUrl.toString(),
          lang: i18n.language,
        }),
      });

      if (!response.ok) return;

      const data = await response.json() as LinkMeta;
      if (!data.title || !Array.isArray(data.tags)) return;

      useLinkMetaStore.getState().set(parsedUrl.toString(), data);
      store.updateBookmark(bookmarkId, {
        title: data.title,
        summary: data.summary || "",
        tags: data.tags.filter((tag) => tag && tag.trim()),
        favicon: data.faviconUrl || favicon,
      });
    } catch {
      // AI 失败？没关系，书签已经存在了
    } finally {
      clearTimeout(timer);
      setIsAiCreating(false);
    }
  }, [addUrl, isAiCreating, store, t, i18n.language]);

  // ─── 打开书签 ──────────────────────────────────────────────────────────────
  const openBookmark = useCallback((id: string, url: string) => {
    store.touchBookmark(id);
    openBookmarkUrl(url);
  }, [store]);

  // ─── 删除 ──────────────────────────────────────────────────────────────────
  const removeBookmark = useCallback((id: string) => {
    store.removeBookmark(id);
  }, [store]);

  // ─── 右键菜单 ──────────────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const openContextMenu = useCallback((e: React.MouseEvent, item: Bookmark) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, target: { kind: "bookmark", item } });
  }, []);

  const openEmptyContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, target: { kind: "empty" } });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // ─── 拖拽排序 ──────────────────────────────────────────────────────────────
  const [draggedItem, setDraggedItem] = useState<{ item: Bookmark; index: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounterRef = useRef(0);

  const handleDragStart = useCallback((e: React.DragEvent, item: Bookmark, index: number) => {
    setDraggedItem({ item, index });
    e.dataTransfer.effectAllowed = "copyMove";
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.setData("application/json", JSON.stringify({ type: "bookmark", bookmarkId: item.id }));
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
    if (dragCounterRef.current === 0) setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragOverIndex(null);
    if (!draggedItem) return;
    if (draggedItem.index !== toIndex) {
      const visibleItems = [...sortedItems];
      const [moved] = visibleItems.splice(draggedItem.index, 1);
      visibleItems.splice(toIndex, 0, moved);
      store.reorderItemsByIds(visibleItems.map((item) => item.id));
    }
    setDraggedItem(null);
  }, [draggedItem, sortedItems, store]);

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

  // ─── Help / About ──────────────────────────────────────────────────────────
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  return {
    items: store.items,
    filteredItems,
    sortedItems,
    groupedByDomain,
    searchQuery,
    setSearchQuery,

    sortMode: store.sortMode,
    setSortMode: store.setSortMode,
    groupByDomain: store.groupByDomain,
    setGroupByDomain: store.setGroupByDomain,

    currentTheme,
    isXpTheme,

    addDialogOpen, setAddDialogOpen,
    addUrl, setAddUrl,
    openAddDialog,
    submitAiBookmark,
    isAiCreating,
    previewFavicon,

    openBookmark,
    removeBookmark,

    contextMenu,
    openContextMenu,
    openEmptyContextMenu,
    closeContextMenu,

    draggedItem,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleDragEnd,

    resetDialogOpen, setResetDialogOpen,
    confirmReset,

    helpOpen, setHelpOpen,
    aboutOpen, setAboutOpen,
  };
}
