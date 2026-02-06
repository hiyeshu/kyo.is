/**
 * [INPUT]: zustand + zustand/middleware(persist)
 * [OUTPUT]: useBookmarkStore, Bookmark, BookmarkFolder, BoardItem, isFolder, DEFAULT_ITEMS
 * [POS]: 书签数据的单一真相源，被 bookmark-board 应用消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── 数据模型 ───────────────────────────────────────────────────────────────

export interface Bookmark {
  title: string;
  url: string;
  favicon?: string;
}

export interface BookmarkFolder {
  title: string;
  bookmarks: Bookmark[];
}

export type BoardItem = Bookmark | BookmarkFolder;

export const isFolder = (item: BoardItem): item is BookmarkFolder =>
  "bookmarks" in item;

// ─── 默认数据 ───────────────────────────────────────────────────────────────

const fav = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

export const DEFAULT_ITEMS: BoardItem[] = [
  { title: "Google", url: "https://google.com", favicon: fav("google.com") },
  { title: "GitHub", url: "https://github.com", favicon: fav("github.com") },
  { title: "YouTube", url: "https://youtube.com", favicon: fav("youtube.com") },
  { title: "Twitter", url: "https://x.com", favicon: fav("x.com") },
  { title: "Reddit", url: "https://reddit.com", favicon: fav("reddit.com") },
  {
    title: "Dev",
    bookmarks: [
      { title: "MDN", url: "https://developer.mozilla.org", favicon: fav("developer.mozilla.org") },
      { title: "Stack Overflow", url: "https://stackoverflow.com", favicon: fav("stackoverflow.com") },
      { title: "npm", url: "https://npmjs.com", favicon: fav("npmjs.com") },
      { title: "Can I Use", url: "https://caniuse.com", favicon: fav("caniuse.com") },
    ],
  },
  {
    title: "Design",
    bookmarks: [
      { title: "Dribbble", url: "https://dribbble.com", favicon: fav("dribbble.com") },
      { title: "Behance", url: "https://behance.net", favicon: fav("behance.net") },
      { title: "Figma", url: "https://figma.com", favicon: fav("figma.com") },
    ],
  },
];

// ─── Store ───────────────────────────────────────────────────────────────────

interface BookmarkStore {
  items: BoardItem[];

  addBookmark: (bm: Bookmark, folderTitle?: string) => void;
  removeBookmark: (url: string, folderTitle?: string) => void;
  addFolder: (title: string) => void;
  removeFolder: (title: string) => void;
  resetToDefaults: () => void;
}

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set) => ({
      items: DEFAULT_ITEMS,

      addBookmark: (bm, folderTitle) =>
        set((s) => {
          if (!folderTitle) return { items: [...s.items, bm] };
          return {
            items: s.items.map((item) =>
              isFolder(item) && item.title === folderTitle
                ? { ...item, bookmarks: [...item.bookmarks, bm] }
                : item
            ),
          };
        }),

      removeBookmark: (url, folderTitle) =>
        set((s) => {
          if (!folderTitle)
            return { items: s.items.filter((i) => isFolder(i) || i.url !== url) };
          return {
            items: s.items.map((item) =>
              isFolder(item) && item.title === folderTitle
                ? { ...item, bookmarks: item.bookmarks.filter((b) => b.url !== url) }
                : item
            ),
          };
        }),

      addFolder: (title) =>
        set((s) => ({ items: [...s.items, { title, bookmarks: [] }] })),

      removeFolder: (title) =>
        set((s) => ({ items: s.items.filter((i) => !isFolder(i) || i.title !== title) })),

      resetToDefaults: () => set({ items: DEFAULT_ITEMS }),
    }),
    {
      name: "bookmark-store",
      version: 1,
    }
  )
);
