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

// ─── Favicon 服务选择 ─────────────────────────────────────────────────────────
// 根据用户地理位置选择最快的 favicon 服务
// 国内: cccyun (快) | 国外: Google (快)

const FAVICON_REGION_KEY = "kyo:favicon-region";

// 检测用户是否在中国（通过 IP 检测 API）
async function detectRegion(): Promise<"cn" | "global"> {
  try {
    // 先检查缓存
    const cached = localStorage.getItem(FAVICON_REGION_KEY);
    if (cached === "cn" || cached === "global") return cached;
    
    // 用 Cloudflare 的 /cdn-cgi/trace 检测，免费且快
    const res = await fetch("https://cloudflare.com/cdn-cgi/trace", { 
      signal: AbortSignal.timeout(3000) 
    });
    const text = await res.text();
    const locMatch = text.match(/loc=(\w+)/);
    const region = locMatch?.[1] === "CN" ? "cn" : "global";
    
    // 缓存结果
    localStorage.setItem(FAVICON_REGION_KEY, region);
    return region;
  } catch {
    // 检测失败默认用国际线路
    return "global";
  }
}

// 同步获取 favicon URL（使用缓存的地区设置）
function getFaviconUrl(domain: string): string {
  const cached = localStorage.getItem(FAVICON_REGION_KEY);
  if (cached === "cn") {
    return `https://favicon.cccyun.cc/${domain}`;
  }
  // 国际线路用 Google
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

// 初始化地区检测（在模块加载时执行一次）
if (typeof window !== "undefined") {
  detectRegion();
}

// 导出给其他模块使用
export { getFaviconUrl };

const fav = (domain: string) => getFaviconUrl(domain);

// ─── 数据模型 ───────────────────────────────────────────────────────────────

// 图标类型：自动获取网站图标 | 自定义上传 | Emoji
export type IconType = "favicon" | "custom" | "emoji";

export interface BookmarkIcon {
  type: IconType;
  value: string; // favicon: URL | custom: base64 data URL | emoji: emoji字符
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string; // 保留兼容性
  icon?: BookmarkIcon; // 新的图标配置
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

// ─── 图标信息（单一真相源） ─────────────────────────────────────────────────────

export interface BookmarkIconInfo {
  type: "favicon" | "emoji" | "custom";
  value: string; // URL | emoji字符 | indexeddb://id
  isEmoji: boolean;
  isCustom: boolean;
  isFavicon: boolean;
}

/**
 * 获取书签图标信息（单一真相源）
 * 所有需要渲染书签图标的地方都应该调用这个函数
 */
export function getBookmarkIconInfo(bookmark: Bookmark): BookmarkIconInfo {
  const icon = bookmark.icon;
  
  if (icon) {
    return {
      type: icon.type,
      value: icon.value,
      isEmoji: icon.type === "emoji",
      isCustom: icon.type === "custom",
      isFavicon: icon.type === "favicon",
    };
  }
  
  // 兼容旧数据：使用 favicon 字段
  if (bookmark.favicon) {
    return {
      type: "favicon",
      value: bookmark.favicon,
      isEmoji: false,
      isCustom: false,
      isFavicon: true,
    };
  }
  
  // 默认：emoji 地球
  return {
    type: "emoji",
    value: "🌐",
    isEmoji: true,
    isCustom: false,
    isFavicon: false,
  };
}

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
  updateBookmark: (id: string, updates: Partial<Pick<Bookmark, "title" | "url" | "favicon" | "icon">>) => void;
  removeBookmark: (id: string) => void;
  
  // 文件夹
  addFolder: (title: string) => string; // 返回新文件夹 ID
  renameFolder: (id: string, newTitle: string) => void;
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

      renameFolder: (id, newTitle) =>
        set((s) => ({
          items: s.items.map((item) =>
            isFolder(item) && item.id === id ? { ...item, title: newTitle } : item
          ),
        })),

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
      version: 3, // v3: 迁移 favicon URL 从 Google 到 cccyun
      migrate: (persisted, version) => {
        const old = persisted as { items?: BoardItem[] };
        
        // 从 v1 迁移：给旧数据加 id
        if (version < 2) {
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
        
        // 从 v2 迁移：把旧 favicon URL 换成根据地区选择的服务
        if (version < 3) {
          const migrateFavicon = (favicon?: string): string | undefined => {
            if (!favicon) return favicon;
            // 匹配 Google favicon API URL
            const googleMatch = favicon.match(/google\.com\/s2\/favicons\?domain=([^&]+)/);
            if (googleMatch) {
              const domain = googleMatch[1];
              return getFaviconUrl(domain);
            }
            // 匹配 DuckDuckGo favicon API URL (以防中间版本用过)
            const ddgMatch = favicon.match(/icons\.duckduckgo\.com\/ip3\/([^.]+\.?[^/]*?)\.ico/);
            if (ddgMatch) {
              const domain = ddgMatch[1];
              return getFaviconUrl(domain);
            }
            // 匹配 cccyun favicon URL (国外用户需要换成 Google)
            const cccyunMatch = favicon.match(/favicon\.cccyun\.cc\/(.+)/);
            if (cccyunMatch) {
              const domain = cccyunMatch[1];
              return getFaviconUrl(domain);
            }
            return favicon;
          };
          
          if (old.items) {
            old.items = old.items.map((item) => {
              if (isFolder(item)) {
                return {
                  ...item,
                  bookmarks: item.bookmarks.map((b) => ({
                    ...b,
                    favicon: migrateFavicon(b.favicon),
                  })),
                };
              }
              return {
                ...item,
                favicon: migrateFavicon((item as Bookmark).favicon),
              } as Bookmark;
            });
          }
        }
        
        return persisted as BookmarkStore;
      },
    }
  )
);
