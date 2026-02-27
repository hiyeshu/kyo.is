/**
 * [INPUT]: 依赖 @/lib/cloudSync 云端操作，依赖 @/lib/supabase Realtime 订阅，
 *          依赖 useBookmarkStore/useStickiesStore 本地数据
 * [OUTPUT]: 对外提供 useSyncStore — initialSync / startRealtime / stopRealtime
 * [POS]: stores/ 的云端数据层，登录时全量拉取 + Realtime 实时同步
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  cloudFetchAll,
  cloudBatchInsert,
  cloudDeleteAll,
} from "@/lib/cloudSync";
import {
  useBookmarkStore,
  type Bookmark,
} from "./useBookmarkStore";
import { useStickiesStore, type StickyNote } from "./useStickiesStore";

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

export type SyncStatus = "idle" | "loading" | "done" | "error";

interface SyncState {
  status: SyncStatus;
  initialSync: () => Promise<void>;
  startRealtime: (userId: string) => void;
  stopRealtime: () => void;
}

// ─── 云端行 → 本地对象 转换 ──────────────────────────────────────────────────

function cloudRowToBookmark(row: Record<string, unknown>): Bookmark {
  return {
    id: row.id as string,
    title: (row.title as string) || "",
    url: (row.url as string) || "",
    summary: (row.summary as string) || "",
    tags: (row.tags as string[]) || [],
    favicon: (row.favicon as string) || "",
    createdAt: row.created_at as string,
    onDesktop: (row.on_desktop as boolean) || false,
    inDock: (row.in_dock as boolean) || false,
  };
}

function cloudRowToNote(row: Record<string, unknown>, index = 0): StickyNote {
  // 错位排列：每个便利贴偏移 30px，超出屏幕高度时换列
  const col = Math.floor(index / 6);
  const rowIdx = index % 6;
  return {
    id: row.id as string,
    content: (row.text as string) || "",
    color: ((row.color as string) || "yellow") as StickyNote["color"],
    tags: (row.tags as string[]) || [],
    onDesktop: (row.on_desktop as boolean) || false,
    position: { x: 100 + col * 240 + rowIdx * 30, y: 100 + rowIdx * 30 },
    size: { width: 220, height: 240 },
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date((row.updated_at as string) || (row.created_at as string)).getTime(),
  };
}

// ─── 防止 Realtime 回写自己的变更 ───────────────────────────────────────────

const recentLocalIds = new Set<string>();
let clearTimer: ReturnType<typeof setTimeout> | null = null;

export function markLocalChange(id: string) {
  recentLocalIds.add(id);
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => recentLocalIds.clear(), 3000);
}

// ─── Store ───────────────────────────────────────────────────────────────────

let channel: RealtimeChannel | null = null;

export const useSyncStore = create<SyncState>((set) => ({
  status: "idle",

  initialSync: async () => {
    set({ status: "loading" });

    try {
      const result = await cloudFetchAll();
      if (!result) {
        console.warn("[sync] cloudFetchAll returned null (not logged in?)");
        set({ status: "idle" });
        return;
      }

      const { bookmarks: cloudBookmarks, notes: cloudNotes } = result;
      const hasCloud = cloudBookmarks.length > 0 || cloudNotes.length > 0;

      if (hasCloud) {
        const bookmarkItems = cloudBookmarks.map((b) => cloudRowToBookmark(b as unknown as Record<string, unknown>));
        useBookmarkStore.setState({ items: bookmarkItems });

        const localNotes = useStickiesStore.getState().notes;
        const stickyNotes = cloudNotes.map((n, i) => {
          const note = cloudRowToNote(n as unknown as Record<string, unknown>, i);
          const local = localNotes.find((ln) => ln.id === note.id);
          return local
            ? { ...note, position: local.position, size: local.size }
            : note;
        });
        useStickiesStore.setState({ notes: stickyNotes });
      } else {
        const localBookmarks = useBookmarkStore.getState().items;
        const localNotes = useStickiesStore.getState().notes;
        const hasLocal = localBookmarks.length > 0 || localNotes.length > 0;

        if (hasLocal) {
          await cloudDeleteAll();
          await cloudBatchInsert([
            ...localBookmarks.map((b) => ({
              id: b.id,
              type: "bookmark" as const,
              title: b.title,
              url: b.url,
              summary: b.summary || null,
              favicon: b.favicon || null,
              tags: b.tags || [],
              on_desktop: b.onDesktop || false,
              in_dock: b.inDock || false,
              created_at: b.createdAt || new Date().toISOString(),
            })),
            ...localNotes.map((n) => ({
              id: n.id,
              type: "note" as const,
              text: n.content,
              color: n.color,
              tags: n.tags || [],
              on_desktop: n.onDesktop || false,
              created_at: new Date(n.createdAt).toISOString(),
              updated_at: new Date(n.updatedAt).toISOString(),
            })),
          ]);
        }
      }

      set({ status: "done" });
    } catch {
      set({ status: "error" });
    }
  },

  startRealtime: (userId: string) => {
    if (channel) return;

    channel = supabase
      .channel("kyo_items_sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kyo_items",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          const row = (newRow || oldRow) as Record<string, unknown>;
          const id = row?.id as string;

          if (recentLocalIds.has(id)) return;

          const type = (newRow as Record<string, unknown>)?.type as string;

          if (type === "bookmark" || (eventType === "DELETE" && !type)) {
            handleBookmarkChange(eventType, newRow as Record<string, unknown>, oldRow as Record<string, unknown>);
          } else if (type === "note") {
            handleNoteChange(eventType, newRow as Record<string, unknown>, oldRow as Record<string, unknown>);
          }
        }
      )
      .subscribe((status) => {
        console.log("[realtime] subscription:", status);
      });
  },

  stopRealtime: () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  },
}));

// ─── Realtime 事件处理 ──────────────────────────────────────────────────────

function handleBookmarkChange(
  event: string,
  newRow: Record<string, unknown> | null,
  oldRow: Record<string, unknown> | null
) {
  const store = useBookmarkStore.getState();

  if (event === "INSERT" && newRow) {
    const exists = store.items.some((b) => b.id === newRow.id);
    if (!exists) {
      useBookmarkStore.setState({
        items: [...store.items, cloudRowToBookmark(newRow)],
      });
    }
  } else if (event === "UPDATE" && newRow) {
    useBookmarkStore.setState({
      items: store.items.map((b) =>
        b.id === newRow.id ? { ...b, ...cloudRowToBookmark(newRow) } : b
      ),
    });
  } else if (event === "DELETE" && oldRow) {
    useBookmarkStore.setState({
      items: store.items.filter((b) => b.id !== oldRow.id),
    });
  }
}

function handleNoteChange(
  event: string,
  newRow: Record<string, unknown> | null,
  oldRow: Record<string, unknown> | null
) {
  const store = useStickiesStore.getState();

  if (event === "INSERT" && newRow) {
    const exists = store.notes.some((n) => n.id === newRow.id);
    if (!exists) {
      const index = store.notes.length;
      useStickiesStore.setState({
        notes: [...store.notes, cloudRowToNote(newRow, index)],
      });
    }
  } else if (event === "UPDATE" && newRow) {
    useStickiesStore.setState({
      notes: store.notes.map((n) =>
        n.id === newRow.id
          ? { ...n, ...cloudRowToNote(newRow), position: n.position, size: n.size }
          : n
      ),
    });
  } else if (event === "DELETE" && oldRow) {
    useStickiesStore.setState({
      notes: store.notes.filter((n) => n.id !== oldRow.id),
    });
  }
}
