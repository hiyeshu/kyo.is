/**
 * [INPUT]: 依赖 @/lib/cloudSync 云端操作，依赖 useBookmarkStore/useStickiesStore 本地数据
 * [OUTPUT]: 对外提供 useSyncStore — initialSync（登录时拉取云端数据）
 * [POS]: stores/ 的云端数据加载，被 useAuthStore 在登录时消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
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
}

// ─── 辅助函数 ─────────────────────────────────────────────────────────────────

function getLocalBookmarks(): Bookmark[] {
  return useBookmarkStore.getState().items;
}

function getLocalNotes(): StickyNote[] {
  return useStickiesStore.getState().notes;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useSyncStore = create<SyncState>((set) => ({
  status: "idle",

  /**
   * 登录后调用一次：
   * - 云端有数据 → 拉取覆盖本地
   * - 云端空、本地有 → 把本地推上去（首次登录）
   * - 都空 → 什么都不做
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
      const hasCloud = cloudBookmarks.length > 0 || cloudNotes.length > 0;
      console.log("[sync] cloud data:", { bookmarks: cloudBookmarks.length, notes: cloudNotes.length, hasCloud });

      if (hasCloud) {
        // 云端有数据 → 覆盖本地
        const bookmarkItems: Bookmark[] = cloudBookmarks.map((b) => ({
          id: b.id,
          title: b.title || "",
          url: b.url || "",
          summary: b.summary || "",
          tags: b.tags || [],
          favicon: b.favicon || "",
          createdAt: b.created_at,
          onDesktop: b.on_desktop || false,
          inDock: b.in_dock || false,
        }));
        useBookmarkStore.setState({ items: bookmarkItems });

        const stickyNotes: StickyNote[] = cloudNotes.map((n) => ({
          id: n.id,
          content: n.text || "",
          color: (n.color || "yellow") as StickyNote["color"],
          tags: n.tags || [],
          onDesktop: n.on_desktop || false,
          position: { x: 100, y: 100 },
          size: { width: 220, height: 240 },
          createdAt: new Date(n.created_at).getTime(),
          updatedAt: new Date(n.updated_at || n.created_at).getTime(),
        }));
        useStickiesStore.setState({ notes: stickyNotes });
      } else {
        // 云端空 → 把本地数据推上去（首次登录场景）
        const localBookmarks = getLocalBookmarks();
        const localNotes = getLocalNotes();
        const hasLocal = localBookmarks.length > 0 || localNotes.length > 0;
        console.log("[sync] cloud empty, local data:", { bookmarks: localBookmarks.length, notes: localNotes.length, hasLocal });

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
}));
