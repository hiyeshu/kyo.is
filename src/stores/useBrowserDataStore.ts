/**
 * [INPUT]: 依赖 zustand 状态管理
 * [OUTPUT]: 对外提供 useBrowserDataStore（浏览器原生书签和历史记录的瞬态存储）
 * [POS]: stores 的浏览器数据接收层，由 useAuthStore 的 postMessage 桥接写入，被 CommandPalette 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";

// ─── 类型 ────────────────────────────────────────────────────────────────────

export interface BrowserBookmark {
  id: string;
  title: string;
  url: string;
  dateAdded?: number;
  folder?: string;
}

export interface BrowserHistoryItem {
  id: string;
  title: string;
  url: string;
  lastVisitTime?: number;
  visitCount: number;
}

interface BrowserDataState {
  bookmarks: BrowserBookmark[];
  history: BrowserHistoryItem[];
  loaded: boolean;
  setBrowserData: (bookmarks: BrowserBookmark[], history: BrowserHistoryItem[]) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useBrowserDataStore = create<BrowserDataState>((set) => ({
  bookmarks: [],
  history: [],
  loaded: false,
  setBrowserData: (bookmarks, history) => set({ bookmarks, history, loaded: true }),
}));
