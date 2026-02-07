/**
 * [INPUT]: zustand + zustand/middleware(persist)
 * [OUTPUT]: useBookmarkStore, Bookmark, BookmarkFolder, BoardItem, isFolder, isBookmark
 * [POS]: 书签数据的单一真相源，被 bookmark-board 和 Dock 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

const generateId = () => crypto.randomUUID();

const fav = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

// ─── 数据模型 ───────────────────────────────────────────────────────────────

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
}

export interface BookmarkFolder {
  id: string;
  title: string;
  bookmarks: Bookmark[];
}

export type BoardItem = Bookmark | BookmarkFolder;

export const isFolder = (item: BoardItem): item is BookmarkFolder =>
  "bookmarks" in item;

export const isBookmark = (item: BoardItem): item is Bookmark =>
  !("bookmarks" in item);

// ─── 创建带 ID 的书签 ─────────────────────────────────────────────────────────

const createBookmark = (title: string, url: string, favicon?: string): Bookmark => ({
  id: generateId(),
  title,
  url,
  favicon: favicon || fav(new URL(url).hostname),
});

const createFolder = (title: string, bookmarks: Bookmark[] = []): BookmarkFolder => ({
  id: generateId(),
  title,
  bookmarks,
});

// ─── 默认数据 ───────────────────────────────────────────────────────────────

const createDefaultItems = (): BoardItem[] => [
  createBookmark("Google", "https://google.com"),
  createBookmark("GitHub", "https://github.com"),
  createBookmark("YouTube", "https://youtube.com"),
  createBookmark("Twitter", "https://x.com"),
  createBookmark("Reddit", "https://reddit.com"),
  createFolder("Dev", [
    createBookmark("MDN", "https://developer.mozilla.org"),
    createBookmark("Stack Overflow", "https://stackoverflow.com"),
    createBookmark("npm", "https://npmjs.com"),
    createBookmark("Can I Use", "https://caniuse.com"),
  ]),
  createFolder("Design", [
    createBookmark("Dribbble", "https://dribbble.com"),
    createBookmark("Behance", "https://behance.net"),
    createBookmark("Figma", "https://figma.com"),
  ]),
];

// ─── Store ───────────────────────────────────────────────────────────────────

interface BookmarkStore {
  items: BoardItem[];

  // 基础 CRUD
  addBookmark: (title: string, url: string, favicon?: string, folderId?: string) => string; // 返回新书签 ID
  updateBookmark: (id: string, updates: Partial<Pick<Bookmark, "title" | "url" | "favicon">>) => void;
  removeBookmark: (id: string) => void;
  
  // 文件夹
  addFolder: (title: string) => string; // 返回新文件夹 ID
  removeFolder: (id: string) => void;
  
  // 排序
  reorderItems: (fromIndex: number, toIndex: number) => void;
  reorderInFolder: (folderId: string, fromIndex: number, toIndex: number) => void;
  moveBookmarkToFolder: (bookmarkId: string, targetFolderId: string | null) => void;
  
  // 查询
  getBookmarkById: (id: string) => Bookmark | undefined;
  
  // 重置
  resetToDefaults: () => void;
}

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set, get) => ({
      items: createDefaultItems(),

      addBookmark: (title, url, favicon, folderId) => {
        const newBookmark = createBookmark(title, url, favicon);
        set((s) => {
          if (!folderId) {
            return { items: [...s.items, newBookmark] };
          }
          return {
            items: s.items.map((item) =>
              isFolder(item) && item.id === folderId
                ? { ...item, bookmarks: [...item.bookmarks, newBookmark] }
                : item
            ),
          };
        });
        return newBookmark.id;
      },

      updateBookmark: (id, updates) =>
        set((s) => ({
          items: s.items.map((item) => {
            if (isBookmark(item) && item.id === id) {
              return { ...item, ...updates };
            }
            if (isFolder(item)) {
              return {
                ...item,
                bookmarks: item.bookmarks.map((b) =>
                  b.id === id ? { ...b, ...updates } : b
                ),
              };
            }
            return item;
          }),
        })),

      removeBookmark: (id) =>
        set((s) => ({
          items: s.items
            .filter((item) => !(isBookmark(item) && item.id === id))
            .map((item) =>
              isFolder(item)
                ? { ...item, bookmarks: item.bookmarks.filter((b) => b.id !== id) }
                : item
            ),
        })),

      addFolder: (title) => {
        const newFolder = createFolder(title);
        set((s) => ({ items: [...s.items, newFolder] }));
        return newFolder.id;
      },

      removeFolder: (id) =>
        set((s) => ({ items: s.items.filter((i) => !(isFolder(i) && i.id === id)) })),

      reorderItems: (fromIndex, toIndex) =>
        set((s) => {
          const newItems = [...s.items];
          const [moved] = newItems.splice(fromIndex, 1);
          newItems.splice(toIndex, 0, moved);
          return { items: newItems };
        }),

      reorderInFolder: (folderId, fromIndex, toIndex) =>
        set((s) => ({
          items: s.items.map((item) => {
            if (isFolder(item) && item.id === folderId) {
              const newBookmarks = [...item.bookmarks];
              const [moved] = newBookmarks.splice(fromIndex, 1);
              newBookmarks.splice(toIndex, 0, moved);
              return { ...item, bookmarks: newBookmarks };
            }
            return item;
          }),
        })),

      moveBookmarkToFolder: (bookmarkId, targetFolderId) =>
        set((s) => {
          // 先找到书签
          let bookmarkToMove: Bookmark | undefined;
          
          // 在顶层找
          const topLevelBookmark = s.items.find(
            (i) => isBookmark(i) && i.id === bookmarkId
          ) as Bookmark | undefined;
          
          if (topLevelBookmark) {
            bookmarkToMove = topLevelBookmark;
          } else {
            // 在文件夹中找
            for (const item of s.items) {
              if (isFolder(item)) {
                const found = item.bookmarks.find((b) => b.id === bookmarkId);
                if (found) {
                  bookmarkToMove = found;
                  break;
                }
              }
            }
          }
          
          if (!bookmarkToMove) return s;
          
          // 从原位置移除
          let newItems = s.items
            .filter((i) => !(isBookmark(i) && i.id === bookmarkId))
            .map((item) =>
              isFolder(item)
                ? { ...item, bookmarks: item.bookmarks.filter((b) => b.id !== bookmarkId) }
                : item
            );
          
          // 添加到目标位置
          if (targetFolderId) {
            newItems = newItems.map((item) =>
              isFolder(item) && item.id === targetFolderId
                ? { ...item, bookmarks: [...item.bookmarks, bookmarkToMove!] }
                : item
            );
          } else {
            newItems = [...newItems, bookmarkToMove];
          }
          
          return { items: newItems };
        }),

      getBookmarkById: (id) => {
        const state = get();
        // 在顶层找
        const topLevel = state.items.find(
          (i) => isBookmark(i) && i.id === id
        ) as Bookmark | undefined;
        if (topLevel) return topLevel;
        
        // 在文件夹中找
        for (const item of state.items) {
          if (isFolder(item)) {
            const found = item.bookmarks.find((b) => b.id === id);
            if (found) return found;
          }
        }
        return undefined;
      },

      resetToDefaults: () => set({ items: createDefaultItems() }),
    }),
    {
      name: "kyo:bookmark-store",
      version: 2, // 版本升级，因为数据结构变了
      migrate: (persisted, version) => {
        // 从 v1 迁移：给旧数据加 id
        if (version < 2) {
          const old = persisted as { items?: BoardItem[] };
          if (old.items) {
            old.items = old.items.map((item) => {
              if (isFolder(item)) {
                return {
                  ...item,
                  id: (item as BookmarkFolder).id || generateId(),
                  bookmarks: item.bookmarks.map((b) => ({
                    ...b,
                    id: (b as Bookmark).id || generateId(),
                  })),
                };
              }
              return {
                ...item,
                id: (item as Bookmark).id || generateId(),
              };
            });
          }
        }
        return persisted as BookmarkStore;
      },
    }
  )
);
