/**
 * [INPUT]: zustand + zustand/middleware(persist), useBookmarkStore
 * [OUTPUT]: useDockStore, DockItem
 * [POS]: Dock 栏状态，固定应用列表、书签引用，被 Dock 组件消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useBookmarkStore } from "./useBookmarkStore";

// Dock item types:
// - app: 应用快捷方式
// - bookmark: 书签引用（从 useBookmarkStore 读取数据）
export interface DockItem {
  type: "app" | "bookmark";
  id: string; // AppId for apps, bookmarkId for bookmarks
}

// Legacy link type for migration
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
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        const state = persisted as { pinnedItems?: LegacyDockItem[] };
        
        if (version < 2 && state.pinnedItems) {
          // Migrate link items to bookmarks
          const bookmarkStore = useBookmarkStore.getState();
          const migratedItems: DockItem[] = [];
          
          for (const item of state.pinnedItems) {
            if (item.type === "link" && item.url) {
              // Create bookmark from link
              const bookmarkId = bookmarkStore.addBookmark(
                item.name || "Website",
                item.url,
                item.icon
              );
              // Add bookmark reference to dock
              migratedItems.push({ type: "bookmark", id: bookmarkId });
            } else if (item.type === "app" || item.type === "bookmark") {
              // Keep as-is
              migratedItems.push({ type: item.type, id: item.id });
            }
          }
          
          state.pinnedItems = migratedItems as LegacyDockItem[];
        }
        
        return persisted as DockStoreState;
      },
    }
  )
);
