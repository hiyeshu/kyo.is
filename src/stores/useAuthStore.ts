/**
 * [INPUT]: 依赖 @/lib/supabase 的客户端，依赖 useSyncStore 的 initialSync / startRealtime / stopRealtime，依赖 useBookmarkStore 的 addBookmark / getBookmarkByUrl，依赖 useBrowserDataStore 的 setBrowserData
 * [OUTPUT]: 对外提供 useAuthStore — user / loading / signInWithGoogle / signOut
 * [POS]: stores/ 的认证状态管理，被 App.tsx 和 AppleMenu 消费，同时承载 extension iframe 桥接（auth + 书签 + 浏览器原生数据）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useSyncStore } from "./useSyncStore";
import { useBookmarkStore } from "./useBookmarkStore";
import { useBrowserDataStore } from "./useBrowserDataStore";
import { fetchLinkMeta } from "@/lib/linkMeta";

const SYNC_DONE_KEY = "kyo:sync-done";
const SYNC_COOLDOWN = 30_000;
const BACKFILL_CONCURRENCY = 2;
const BACKFILL_INTERVAL_MS = 5_000;

let visibilityHandler: (() => void) | null = null;
let lastSyncTime = 0;

// ─── Extension iframe 桥接 ──────────────────────────────────────────────────
// 如果 kyo.is 运行在插件的 newtab iframe 中，通过 postMessage 传递 session
// newtab.html 先发握手消息，kyo.is 收到后才回传，用 event.origin 验证来源

let extensionOrigin: string | null = null;

function initExtensionBridge() {
  if (window.parent === window) return; // 不在 iframe 中
  window.addEventListener("message", (e) => {
    if (!e.origin.startsWith("chrome-extension://")) return;

    // 握手：记录来源，回传 session
    if (e.data?.type === "kyo:handshake") {
      extensionOrigin = e.origin;
      supabase.auth.getSession().then(({ data }) => {
        postSessionToExtension(data.session);
      });
    }

    // 书签桥接：插件收藏 → 写入本地 store（无需登录）
    if (e.data?.type === "kyo:bookmark-add" && e.data.bookmark) {
      const bm = e.data.bookmark;
      const store = useBookmarkStore.getState();
      if (!store.getBookmarkByUrl(bm.url)) {
        store.addBookmark(bm.title, bm.url, bm.favicon, { onDesktop: true });
      }
    }

    // 全量书签同步：newtab 加载时从插件拉取所有书签
    if (e.data?.type === "kyo:bookmark-sync" && Array.isArray(e.data.bookmarks)) {
      const store = useBookmarkStore.getState();
      for (const bm of e.data.bookmarks) {
        if (bm.url && !store.getBookmarkByUrl(bm.url)) {
          store.addBookmark(bm.title, bm.url, bm.favicon, { onDesktop: bm.onDesktop ?? true });
        }
      }
    }

    // 浏览器原生数据：书签 + 历史记录 → useBrowserDataStore
    if (e.data?.type === "kyo:browser-data") {
      useBrowserDataStore.getState().setBrowserData(
        e.data.bookmarks || [],
        e.data.history || [],
      );
    }
  });
}

function postSessionToExtension(session: Session | null) {
  if (!extensionOrigin) return;
  const payload = session
    ? {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: session.user,
      }
    : null;
  window.parent.postMessage({ type: "kyo:auth", session: payload }, extensionOrigin);
}

// ─── 用户就绪 ────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  loading: boolean;
  init: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * 自愈机制：扫描 summary 为空的书签，后台批量补数据。
 * 从 link_meta 缓存回填（秒回）或重新走 Dify（后台完成）。
 */
async function backfillEmptySummaries() {
  const bookmarks = useBookmarkStore.getState().items;
  const toFill = bookmarks.filter((b) => b.url && (
    !b.summary || b.summary === b.url || !b.tags?.length
  ));
  if (toFill.length === 0) return;

  let idx = 0;

  async function nextBatch() {
    if (idx >= toFill.length) return;

    const batch = toFill.slice(idx, idx + BACKFILL_CONCURRENCY);
    idx += BACKFILL_CONCURRENCY;

    await Promise.allSettled(
      batch.map((b) =>
        fetchLinkMeta(b.url, { skipLocalCache: true }).then((meta) => {
          const updates: Record<string, unknown> = {};
          if (meta.title && meta.title !== b.title) updates.title = meta.title;
          if (meta.summary) updates.summary = meta.summary;
          if (meta.tags?.length) updates.tags = meta.tags;
          if (meta.faviconUrl && !b.icon) updates.favicon = meta.faviconUrl;
          if (Object.keys(updates).length > 0) {
            useBookmarkStore.getState().updateBookmark(b.id, updates);
          }
        }).catch(() => { /* 单个失败不影响其他 */ })
      )
    );

    if (idx < toFill.length) {
      setTimeout(() => {
        if (typeof requestIdleCallback === "function") {
          requestIdleCallback(() => nextBatch());
        } else {
          nextBatch();
        }
      }, BACKFILL_INTERVAL_MS);
    }
  }

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => nextBatch());
  } else {
    setTimeout(() => nextBatch(), 2000);
  }
}

async function handleUserReady(user: User) {
  const sync = useSyncStore.getState();

  if (!localStorage.getItem(SYNC_DONE_KEY)) {
    await sync.initialSync();
    localStorage.setItem(SYNC_DONE_KEY, "1");
    lastSyncTime = Date.now();
  }

  sync.startRealtime(user.id);
  backfillEmptySummaries();

  if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
  visibilityHandler = () => {
    if (document.visibilityState === "visible" && Date.now() - lastSyncTime > SYNC_COOLDOWN) {
      lastSyncTime = Date.now();
      sync.initialSync().then(() => backfillEmptySummaries());
    }
  };
  document.addEventListener("visibilitychange", visibilityHandler);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  init: () => {
    initExtensionBridge();

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const user = data.session?.user ?? null;
      set({ user, loading: false });
      if (user) handleUserReady(user);
      postSessionToExtension(data.session);
    });

    supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      set({ user: session?.user ?? null, loading: false });

      if (event === "SIGNED_IN" && session?.user) {
        handleUserReady(session.user);
        postSessionToExtension(session);
      }

      if (event === "SIGNED_OUT") {
        localStorage.removeItem(SYNC_DONE_KEY);
        useSyncStore.getState().stopRealtime();
        if (visibilityHandler) {
          document.removeEventListener("visibilitychange", visibilityHandler);
          visibilityHandler = null;
        }
        postSessionToExtension(null);
      }
    });
  },

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
