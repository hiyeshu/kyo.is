/**
 * [INPUT]: 依赖 @/lib/supabase 客户端，依赖 useBookmarkStore/useStickiesStore 本地数据
 * [OUTPUT]: 对外提供 useSyncStore — 同步状态、checkSyncStatus、uploadToCloud、downloadFromCloud
 * [POS]: stores/ 的数据同步状态管理，被 SyncDialog 和 App.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useBookmarkStore, isBookmark, isFolder, type Bookmark, type BoardItem } from "./useBookmarkStore";
import { useStickiesStore, type StickyNote } from "./useStickiesStore";

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

export type SyncStatus = "idle" | "checking" | "syncing" | "done" | "error";

export type SyncChoice = "local" | "cloud" | null;

export interface CloudData {
  bookmarks: CloudBookmark[];
  notes: CloudNote[];
  count: { bookmarks: number; notes: number };
}

interface CloudBookmark {
  id: string;
  title: string;
  url: string;
  summary: string;
  tags: string[];
  favicon: string;
  createdAt: string;
  onDesktop: boolean;
}

interface CloudNote {
  id: string;
  content: string;
  color: string;
  tags: string[];
  onDesktop: boolean;
  createdAt: number;
  updatedAt: number;
}

interface SyncState {
  // 状态
  status: SyncStatus;
  showDialog: boolean;
  localCount: { bookmarks: number; notes: number };
  cloudCount: { bookmarks: number; notes: number };
  errorMessage: string | null;
  
  // 操作
  checkSyncStatus: () => Promise<void>;
  uploadToCloud: () => Promise<void>;
  downloadFromCloud: () => Promise<void>;
  closeDialog: () => void;
  reset: () => void;
}

// ─── 辅助函数 ─────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

function getLocalBookmarks(): Bookmark[] {
  const items = useBookmarkStore.getState().items;
  const bookmarks: Bookmark[] = [];
  
  for (const item of items) {
    if (isBookmark(item)) {
      bookmarks.push(item);
    } else if (isFolder(item)) {
      bookmarks.push(...item.bookmarks);
    }
  }
  
  return bookmarks;
}

function getLocalNotes(): StickyNote[] {
  return useStickiesStore.getState().notes;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useSyncStore = create<SyncState>((set, get) => ({
  status: "idle",
  showDialog: false,
  localCount: { bookmarks: 0, notes: 0 },
  cloudCount: { bookmarks: 0, notes: 0 },
  errorMessage: null,

  // ─── 检查同步状态 ─────────────────────────────────────────────────────────
  checkSyncStatus: async () => {
    set({ status: "checking", errorMessage: null });

    try {
      const token = await getAccessToken();
      if (!token) {
        set({ status: "idle" });
        return;
      }

      // 获取本地数据数量
      const localBookmarks = getLocalBookmarks();
      const localNotes = getLocalNotes();
      const localCount = {
        bookmarks: localBookmarks.length,
        notes: localNotes.length,
      };

      // 获取云端数据数量
      const res = await fetch("/api/sync", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch cloud data");
      }

      const cloudData: CloudData = await res.json();
      const cloudCount = cloudData.count;

      set({ localCount, cloudCount });

      // 判断是否需要弹窗
      const hasLocal = localCount.bookmarks > 0 || localCount.notes > 0;
      const hasCloud = cloudCount.bookmarks > 0 || cloudCount.notes > 0;

      if (!hasLocal && !hasCloud) {
        // 两边都没数据，不需要同步
        set({ status: "done", showDialog: false });
      } else if (!hasCloud && hasLocal) {
        // 云端没数据，本地有 → 自动上传
        await get().uploadToCloud();
      } else if (!hasLocal && hasCloud) {
        // 本地没数据，云端有 → 自动下载
        await get().downloadFromCloud();
      } else {
        // 两边都有数据 → 弹窗让用户选择
        set({ status: "idle", showDialog: true });
      }
    } catch (err) {
      set({
        status: "error",
        errorMessage: err instanceof Error ? err.message : "同步检查失败",
      });
    }
  },

  // ─── 上传本地数据到云端 ─────────────────────────────────────────────────────
  uploadToCloud: async () => {
    set({ status: "syncing", errorMessage: null });

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("ERROR_NOT_AUTHENTICATED");

      // 先清空云端数据
      await fetch("/api/sync", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      // 上传本地数据
      const bookmarks = getLocalBookmarks();
      const notes = getLocalNotes();

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookmarks: bookmarks.map(b => ({
            id: b.id,
            title: b.title,
            url: b.url,
            summary: b.summary,
            tags: b.tags,
            favicon: b.favicon,
            createdAt: b.createdAt,
            onDesktop: b.onDesktop,
          })),
          notes: notes.map(n => ({
            id: n.id,
            content: n.content,
            color: n.color,
            tags: n.tags,
            onDesktop: n.onDesktop,
            createdAt: n.createdAt,
            updatedAt: n.updatedAt,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      set({ status: "done", showDialog: false });
    } catch (err) {
      set({
        status: "error",
        errorMessage: err instanceof Error ? err.message : "上传失败",
      });
    }
  },

  // ─── 从云端下载数据覆盖本地 ─────────────────────────────────────────────────
  downloadFromCloud: async () => {
    set({ status: "syncing", errorMessage: null });

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("ERROR_NOT_AUTHENTICATED");

      const res = await fetch("/api/sync", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch cloud data");
      }

      const cloudData: CloudData = await res.json();

      // 转换云端书签格式并覆盖本地
      const bookmarkItems: BoardItem[] = cloudData.bookmarks.map(b => ({
        id: b.id,
        title: b.title,
        url: b.url,
        summary: b.summary || "",
        tags: b.tags || [],
        favicon: b.favicon || "",
        createdAt: b.createdAt || new Date().toISOString(),
        onDesktop: b.onDesktop || false,
      }));

      // 直接设置 store 状态（绕过 action 以实现批量覆盖）
      useBookmarkStore.setState({ items: bookmarkItems });

      // 转换云端便签格式并覆盖本地
      const stickyNotes: StickyNote[] = cloudData.notes.map(n => ({
        id: n.id,
        content: n.content || "",
        color: (n.color || "yellow") as StickyNote["color"],
        tags: n.tags || [],
        onDesktop: n.onDesktop || false,
        position: { x: 100, y: 100 }, // 默认位置
        size: { width: 220, height: 240 }, // 默认尺寸
        createdAt: n.createdAt || Date.now(),
        updatedAt: n.updatedAt || Date.now(),
      }));

      useStickiesStore.setState({ notes: stickyNotes });

      set({ status: "done", showDialog: false });
    } catch (err) {
      set({
        status: "error",
        errorMessage: err instanceof Error ? err.message : "下载失败",
      });
    }
  },

  closeDialog: () => set({ showDialog: false }),

  reset: () => set({
    status: "idle",
    showDialog: false,
    localCount: { bookmarks: 0, notes: 0 },
    cloudCount: { bookmarks: 0, notes: 0 },
    errorMessage: null,
  }),
}));
