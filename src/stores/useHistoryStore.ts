/**
 * [INPUT]: zustand + zustand/middleware(persist)
 * [OUTPUT]: useHistoryStore — 本地历史记录，addEntry / markDeleted / getEntries
 * [POS]: stores/ 的本地活动日志，记录书签/便签的添加与删除，纯 localStorage 不同步云端
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── 类型 ──────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  type: "bookmark" | "note";
  title: string;
  url?: string;
  content?: string;
  favicon?: string;
  tags: string[];
  createdAt: number;
  deletedAt?: number;
}

interface HistoryState {
  entries: HistoryEntry[];
  seeded: boolean;
  addEntry: (entry: Omit<HistoryEntry, "deletedAt">) => void;
  markDeleted: (id: string) => void;
  seed: (entries: Omit<HistoryEntry, "deletedAt">[]) => void;
  clearAll: () => void;
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      seeded: false,

      addEntry: (entry) => {
        if (get().entries.some((e) => e.id === entry.id)) return;
        set((s) => ({
          entries: [{ ...entry, deletedAt: undefined }, ...s.entries],
        }));
      },

      markDeleted: (id) => {
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === id && !e.deletedAt ? { ...e, deletedAt: Date.now() } : e
          ),
        }));
      },

      seed: (items) => {
        if (get().seeded) return;
        const existing = new Set(get().entries.map((e) => e.id));
        const fresh = items
          .filter((item) => !existing.has(item.id))
          .map((item) => ({ ...item, deletedAt: undefined }));
        set((s) => ({
          entries: [...fresh, ...s.entries].sort((a, b) => b.createdAt - a.createdAt),
          seeded: true,
        }));
      },

      clearAll: () => set({ entries: [], seeded: false }),
    }),
    { name: "kyo.history" }
  )
);
