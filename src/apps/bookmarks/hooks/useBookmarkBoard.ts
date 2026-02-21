/**
  * [INPUT]: useBookmarkStore, useThemeStore, useToast, getApiUrl, extractFirstUrl, useTranslation
  * [OUTPUT]: useBookmarkBoard hook
  * [POS]: bookmarks 的全部业务逻辑，被 BookmarkBoardApp 消费
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
import { toast } from "@/hooks/useToast";
import { getApiUrl, extractFirstUrl } from "@/utils/platform";
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
  const { t } = useTranslation();

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
    if (store.sortMode === "name") {
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

  // ─── AI 添加书签 ──────────────────────────────────────────────────────────
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

    setIsAiCreating(true);
    try {
      const response = await fetch(getApiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: `You are a link ingestion assistant. Return JSON only: {"title":"...","summary":"...","tags":["..."]}. Summary should be two or three sentences. No extra text.` },
            { role: "user", content: parsedUrl.toString() },
          ],
          task: "link-ingest",
        }),
      });

      if (!response.ok) return;

      const text = await response.text();
      const fullContent = text
        .split("\n")
        .filter((line) => line.startsWith("0:"))
        .map((line) => { try { return JSON.parse(line.slice(2)) as string; } catch { return ""; } })
        .join("");
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;
      const data = JSON.parse(jsonMatch[0]) as { title: string; summary: string; tags: string[] };

      if (!data.title || !data.summary || !Array.isArray(data.tags)) return;

      const trimmedTags = data.tags.filter((tag) => tag && tag.trim());
      store.addAiBookmark(data.title, parsedUrl.toString(), data.summary, trimmedTags);
      setAddDialogOpen(false);
      setAddUrl("");
    } catch { /* noop */ } finally {
      setIsAiCreating(false);
    }
  }, [addUrl, isAiCreating, store, t]);

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
      store.reorderItems(draggedItem.index, toIndex);
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
