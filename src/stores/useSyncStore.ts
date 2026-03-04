/**
 * [INPUT]: 依赖 @/lib/cloudSync 云端操作，依赖 @/lib/supabase Realtime 订阅，
 *          依赖 useBookmarkStore/useStickiesStore 本地数据
 * [OUTPUT]: 对外提供 useSyncStore — initialSync / startRealtime / stopRealtime
 *           对外提供 markLocalChange / trackDeletion（被 bookmark/stickies store 消费）
 * [POS]: stores/ 的云端数据层，登录时双向 merge + Realtime 实时同步
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  cloudFetchAll,
  cloudUpsertItem,
  cloudDeleteItem,
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
    updatedAt: (row.updated_at as string) || (row.created_at as string),
    onDesktop: (row.on_desktop as boolean) || false,
    inDock: (row.in_dock as boolean) || false,
  };
}

function cloudRowToNote(row: Record<string, unknown>, index = 0): StickyNote {
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

// ─── 本地对象 → 云端行 转换（initialSync 回写用） ───────────────────────────

function bookmarkToCloudRow(b: Bookmark): Record<string, unknown> {
  return {
    id: b.id,
    type: "bookmark",
    title: b.title,
    url: b.url,
    summary: b.summary || null,
    favicon: b.favicon || null,
    tags: b.tags || [],
    on_desktop: b.onDesktop || false,
    in_dock: b.inDock || false,
    created_at: b.createdAt || new Date().toISOString(),
    updated_at: b.updatedAt || b.createdAt || new Date().toISOString(),
  };
}

function noteToCloudRow(n: StickyNote): Record<string, unknown> {
  return {
    id: n.id,
    type: "note",
    text: n.content,
    color: n.color,
    tags: n.tags || [],
    on_desktop: n.onDesktop || false,
    created_at: new Date(n.createdAt).toISOString(),
    updated_at: new Date(n.updatedAt).toISOString(),
  };
}

// ─── 防止 Realtime 回写自己的变更（per-ID 独立计时） ─────────────────────────

const recentLocalIds = new Map<string, ReturnType<typeof setTimeout>>();

export function markLocalChange(id: string) {
  const existing = recentLocalIds.get(id);
  if (existing) clearTimeout(existing);
  recentLocalIds.set(
    id,
    setTimeout(() => recentLocalIds.delete(id), 5000)
  );
}

// ─── 离线删除追踪 ────────────────────────────────────────────────────────────
// 用户在登出/离线期间删除的条目 ID，登录后 merge 时跳过这些条目并从云端清除

const DELETED_IDS_KEY = "kyo:deleted-ids";

export function trackDeletion(id: string) {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(ids));
    }
  } catch { /* noop */ }
}



function getDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function clearDeletedIds(idsToRemove?: Set<string>) {
  if (!idsToRemove) {
    localStorage.removeItem(DELETED_IDS_KEY);
    return;
  }
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    const remaining = ids.filter((id) => !idsToRemove.has(id));
    if (remaining.length === 0) {
      localStorage.removeItem(DELETED_IDS_KEY);
    } else {
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(remaining));
    }
  } catch {
    localStorage.removeItem(DELETED_IDS_KEY);
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

let channel: RealtimeChannel | null = null;

export const useSyncStore = create<SyncState>((set) => ({
  status: "idle",

  /**
   * 双向 merge 策略（替代旧的"云端覆盖本地"）：
   * 1. 本地有 + 云端有 → 比较 updatedAt，新的赢
   * 2. 仅本地有 → 保留并推送到云端
   * 3. 仅云端有 → 拉到本地（除非在离线删除集合中）
   * 4. 离线期间删除的 → 跳过并从云端清除
   */
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
      const deletedIds = getDeletedIds();

      // ── 构建云端索引 ───────────────────────────────────────────────
      const cloudBmMap = new Map<string, Record<string, unknown>>();
      for (const cb of cloudBookmarks) {
        cloudBmMap.set(cb.id, cb as unknown as Record<string, unknown>);
      }
      const cloudNtMap = new Map<string, Record<string, unknown>>();
      for (const cn of cloudNotes) {
        cloudNtMap.set(cn.id, cn as unknown as Record<string, unknown>);
      }

      const toUpsert: Record<string, unknown>[] = [];
      const toDeleteCloud: string[] = [];

      // ── Merge 书签（以本地顺序为基础） ─────────────────────────────
      const localBookmarks = useBookmarkStore.getState().items;
      const localBmMap = new Map<string, Bookmark>();
      for (const lb of localBookmarks) localBmMap.set(lb.id, lb);

      const mergedBookmarks: Bookmark[] = [];

      for (const local of localBookmarks) {
        if (deletedIds.has(local.id)) continue;
        const cloud = cloudBmMap.get(local.id);
        if (cloud) {
          const ct = new Date((cloud.updated_at as string) || (cloud.created_at as string)).getTime();
          const lt = new Date(local.updatedAt || local.createdAt).getTime();
          if (lt >= ct) {
            mergedBookmarks.push(local);
            toUpsert.push(bookmarkToCloudRow(local));
          } else {
            mergedBookmarks.push(cloudRowToBookmark(cloud));
          }
        } else {
          mergedBookmarks.push(local);
          toUpsert.push(bookmarkToCloudRow(local));
        }
      }

      for (const [id, cloud] of cloudBmMap) {
        if (deletedIds.has(id)) {
          toDeleteCloud.push(id);
          continue;
        }
        if (!localBmMap.has(id)) {
          mergedBookmarks.push(cloudRowToBookmark(cloud));
        }
      }

      // ── Merge 便签（以本地顺序为基础，保留本地 position/size） ──────
      const localNotes = useStickiesStore.getState().notes;
      const localNtMap = new Map<string, StickyNote>();
      for (const ln of localNotes) localNtMap.set(ln.id, ln);

      const mergedNotes: StickyNote[] = [];

      for (const local of localNotes) {
        if (deletedIds.has(local.id)) continue;
        const cloud = cloudNtMap.get(local.id);
        if (cloud) {
          const ct = new Date((cloud.updated_at as string) || (cloud.created_at as string)).getTime();
          const lt = local.updatedAt;
          if (lt >= ct) {
            mergedNotes.push(local);
            toUpsert.push(noteToCloudRow(local));
          } else {
            const idx = mergedNotes.length;
            const cloudNote = cloudRowToNote(cloud, idx);
            mergedNotes.push({ ...cloudNote, position: local.position, size: local.size });
          }
        } else {
          mergedNotes.push(local);
          toUpsert.push(noteToCloudRow(local));
        }
      }

      for (const [id, cloud] of cloudNtMap) {
        if (deletedIds.has(id)) {
          toDeleteCloud.push(id);
          continue;
        }
        if (!localNtMap.has(id)) {
          const idx = mergedNotes.length;
          mergedNotes.push(cloudRowToNote(cloud, idx));
        }
      }

      // ── 应用合并结果 ───────────────────────────────────────────────
      useBookmarkStore.setState({ items: mergedBookmarks });
      useStickiesStore.setState({ notes: mergedNotes });

      // ── 回写云端（本地独有 / 本地更新的条目） ──────────────────────
      for (const item of toUpsert) {
        markLocalChange(item.id as string);
        await cloudUpsertItem(item);
      }

      const confirmedGone = new Set<string>();

      // 本来就不在云端的 → 确认消失
      for (const id of deletedIds) {
        if (!cloudBmMap.has(id) && !cloudNtMap.has(id)) {
          confirmedGone.add(id);
        }
      }

      // 尝试删除云端残留的，成功的 → 确认消失
      for (const id of toDeleteCloud) {
        markLocalChange(id);
        const ok = await cloudDeleteItem(id);
        if (ok) confirmedGone.add(id);
      }

      clearDeletedIds(confirmedGone);
      set({ status: "done" });
    } catch (e) {
      console.error("[sync] initialSync failed:", e);
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
