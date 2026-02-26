/**
 * [INPUT]: 依赖 @/lib/supabase 的客户端，依赖 useSyncStore 的 initialSync / startRealtime / stopRealtime
 * [OUTPUT]: 对外提供 useAuthStore — user / loading / signInWithGoogle / signOut
 * [POS]: stores/ 的认证状态管理，被 App.tsx 和 AppleMenu 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useSyncStore } from "./useSyncStore";

const SYNC_DONE_KEY = "kyo:sync-done-session";

// ─── Extension iframe 桥接 ──────────────────────────────────────────────────
// 如果 kyo.is 运行在插件的 newtab iframe 中，通过 postMessage 传递 session
// newtab.html 先发握手消息，kyo.is 收到后才回传，用 event.origin 验证来源

let extensionOrigin: string | null = null;

function initExtensionBridge() {
  if (window.parent === window) return; // 不在 iframe 中
  window.addEventListener("message", (e) => {
    if (e.data?.type === "kyo:handshake" && e.origin.startsWith("chrome-extension://")) {
      extensionOrigin = e.origin;
      // 握手成功，立即发送当前 session
      supabase.auth.getSession().then(({ data }) => {
        postSessionToExtension(data.session);
      });
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

function handleUserReady(user: User) {
  const sync = useSyncStore.getState();

  if (!sessionStorage.getItem(SYNC_DONE_KEY)) {
    sessionStorage.setItem(SYNC_DONE_KEY, "true");
    sync.initialSync();
  }

  sync.startRealtime(user.id);
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
        sessionStorage.removeItem(SYNC_DONE_KEY);
        useSyncStore.getState().stopRealtime();
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
