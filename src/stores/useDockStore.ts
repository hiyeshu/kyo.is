/**
 * [INPUT]: zustand + zustand/middleware(persist)
 * [OUTPUT]: useDockStore, DockItem
 * [POS]: Dock 栏状态，固定应用列表，被 Dock 组件消费。书签 inDock 由 useBookmarkStore 管理
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Dock item: 仅应用快捷方式。书签 inDock 状态已迁移至 useBookmarkStore
export interface DockItem {
  type: "app";
  id: string; // AppId
}

// Legacy item types for migration
interface LegacyDockItem {
  type: "app" | "bookmark" | "link";
  id: string;
  name?: string;
  icon?: string;
  url?: string;
}

// Protected items that cannot be removed from dock
export const PROTECTED_DOCK_ITEMS = new Set(["__applications__", "__trash__"]);

// Default pinned items - Kyo is bookmark-focused, start with bookmarks and chat
const DEFAULT_PINNED_ITEMS: DockItem[] = [
  { type: "app", id: "bookmarks" },
  { type: "app", id: "chat" },
];

interface DockStoreState {
  pinnedItems: DockItem[];
  scale: number; // Dock icon scale (0.5 to 1.5)
  hiding: boolean; // Whether dock auto-hides
  magnification: boolean; // Whether magnification is enabled
  // Actions
  addItem: (item: DockItem, insertIndex?: number) => boolean; // Returns false if duplicate
  removeItem: (id: string) => boolean; // Returns false if protected
  reorderItems: (fromIndex: number, toIndex: number) => void;
  hasItem: (id: string) => boolean;
  setScale: (scale: number) => void;
  setHiding: (hiding: boolean) => void;
  setMagnification: (magnification: boolean) => void;
  reset: () => void;
}

export const useDockStore = create<DockStoreState>()(
  persist(
    (set, get) => ({
      pinnedItems: DEFAULT_PINNED_ITEMS,
      scale: 1, // Default scale
      hiding: false, // Default: dock always visible
      magnification: true, // Default: magnification enabled

      addItem: (item: DockItem, insertIndex?: number) => {
        const { pinnedItems } = get();
        
        // Check for duplicates by id (works for all types)
        const exists = pinnedItems.some((existing) => existing.id === item.id);

        if (exists) {
          return false;
        }

        set((state) => {
          const newItems = [...state.pinnedItems];
          const index = insertIndex !== undefined 
            ? Math.max(0, Math.min(insertIndex, newItems.length))
            : newItems.length;
          newItems.splice(index, 0, item);
          return { pinnedItems: newItems };
        });

        return true;
      },

      removeItem: (id: string) => {
        // Don't allow removing protected items
        if (PROTECTED_DOCK_ITEMS.has(id)) {
          return false;
        }

        set((state) => ({
          pinnedItems: state.pinnedItems.filter((item) => item.id !== id),
        }));

        return true;
      },

      reorderItems: (fromIndex: number, toIndex: number) => {
        set((state) => {
          const newItems = [...state.pinnedItems];
          const [removed] = newItems.splice(fromIndex, 1);
          if (removed) {
            newItems.splice(toIndex, 0, removed);
          }
          return { pinnedItems: newItems };
        });
      },

      hasItem: (id: string) => {
        return get().pinnedItems.some((item) => item.id === id);
      },

      setScale: (scale: number) => {
        // Clamp scale between 0.5 and 1.5
        const clampedScale = Math.max(0.5, Math.min(1.5, scale));
        set({ scale: clampedScale });
      },

      setHiding: (hiding: boolean) => {
        set({ hiding });
      },

      setMagnification: (magnification: boolean) => {
        set({ magnification });
      },

      reset: () => {
        set({ pinnedItems: DEFAULT_PINNED_ITEMS, scale: 1, hiding: false, magnification: true });
      },
    }),
    {
      name: "kyo:dock-storage",
      version: 4,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        const state = persisted as { pinnedItems?: LegacyDockItem[] };
        
        if (version < 2 && state.pinnedItems) {
          // v1→v2: Migrate link items — 创建书签并标记 inDock
          // 注意: useBookmarkStore 可能还没 rehydrate，
          // 但 useBookmarkStore 的 v7 迁移会从 kyo:dock-storage 读 bookmark ids，
          // 所以此处只保留 bookmark 引用，v4 迁移统一清理
          const migratedItems: LegacyDockItem[] = [];
          
          for (const item of state.pinnedItems) {
            if (item.type === "link" && item.url) {
              // link → bookmark 创建由 useBookmarkStore v7 迁移处理
              // 这里只保留 app 类型
            } else {
              migratedItems.push(item);
            }
          }
          
          state.pinnedItems = migratedItems;
        }

        if (version < 3 && state.pinnedItems) {
          // v2→v3: 确保 chat 在 dock 中
          const hasChat = state.pinnedItems.some((item) => item.id === "chat");
          if (!hasChat) {
            state.pinnedItems.push({ type: "app", id: "chat" } as LegacyDockItem);
          }
        }

        if (version < 4 && state.pinnedItems) {
          // v3→v4: 剥离 bookmark 引用，仅保留 app 类型
          // 书签的 inDock 状态由 useBookmarkStore v7 迁移接管
          state.pinnedItems = state.pinnedItems.filter((item) => item.type === "app");
        }
        
        return persisted as DockStoreState;
      },
    }
  )
);
