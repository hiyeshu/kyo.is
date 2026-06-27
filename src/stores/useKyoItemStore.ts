/**
 * [INPUT]: 依赖 useBookmarkStore 的书签数据，依赖 useStickiesStore 的便签数据
 * [OUTPUT]: useKyoItemStore — getAllItems / search / getRecent 统一查询
 * [POS]: stores/ 的派生查询层，不持有数据，只读取 bookmark + stickies 并统一为 KyoItem，保留 orderIndex
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useBookmarkStore } from "./useBookmarkStore";
import { useStickiesStore } from "./useStickiesStore";
import type { KyoItem, KyoBookmarkItem, KyoNoteItem } from "@/types/kyoItem";

// ─── 转换函数 ─────────────────────────────────────────────────────────────────

function bookmarkToKyoItem(bm: { id: string; title: string; url: string; summary: string; tags: string[]; createdAt: string; orderIndex?: number; favicon?: string }): KyoBookmarkItem {
  return {
    type: "bookmark",
    id: bm.id,
    title: bm.title,
    url: bm.url,
    summary: bm.summary,
    tags: bm.tags,
    createdAt: new Date(bm.createdAt).getTime(),
    orderIndex: bm.orderIndex ?? 0,
    favicon: bm.favicon,
  };
}

function noteToKyoItem(note: { id: string; content: string; tags: string[]; createdAt: number; updatedAt: number; orderIndex?: number; color: string }): KyoNoteItem {
  return {
    type: "note",
    id: note.id,
    content: note.content,
    tags: note.tags,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    orderIndex: note.orderIndex ?? 0,
    color: note.color,
  };
}

// ─── 查询函数（非 store，纯函数） ─────────────────────────────────────────────

export function getAllItems(): KyoItem[] {
  const bookmarkItems = useBookmarkStore.getState().items;
  const notes = useStickiesStore.getState().notes;

  const kyoItems: KyoItem[] = [
    ...bookmarkItems.map(bookmarkToKyoItem),
    ...notes.map(noteToKyoItem),
  ];

  return kyoItems.sort((a, b) => b.createdAt - a.createdAt);
}

export function searchItems(query: string): KyoItem[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return getAllItems().filter((item) => {
    if (item.type === "bookmark") {
      return (
        item.title.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return (
      item.content.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q))
    );
  });
}

export function getRecent(days: number): KyoItem[] {
  const cutoff = Date.now() - days * 86400000;
  return getAllItems().filter((item) => item.createdAt >= cutoff);
}

// ─── React Hook（响应式） ─────────────────────────────────────────────────────

export function useKyoItems() {
  const bookmarkItems = useBookmarkStore((s) => s.items);
  const notes = useStickiesStore((s) => s.notes);

  const kyoItems: KyoItem[] = [
    ...bookmarkItems.map(bookmarkToKyoItem),
    ...notes.map(noteToKyoItem),
  ];

  return kyoItems.sort((a, b) => b.createdAt - a.createdAt);
}
