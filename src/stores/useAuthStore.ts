/**
 * [INPUT]: 依赖 @/lib/supabase 的客户端，依赖 useSyncStore 的 initialSync
 * [OUTPUT]: 对外提供 useAuthStore — user / loading / signInWithGoogle / signOut
 * [POS]: stores/ 的认证状态管理，被 App.tsx 和 AppleMenu 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useSyncStore } from "./useSyncStore";

// 记录是否已经对当前会话执行过初始同步
const SYNC_DONE_KEY = "kyo:sync-done-session";

interface AuthState {
  user: User | null;
  loading: boolean;
  init: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  init: () => {
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const user = data.session?.user ?? null;
      set({ user, loading: false });

      // 已登录且本次会话未同步过 → 拉取云端数据
      if (user && !sessionStorage.getItem(SYNC_DONE_KEY)) {
        sessionStorage.setItem(SYNC_DONE_KEY, "true");
        useSyncStore.getState().initialSync();
      }
    });

    supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      set({ user: session?.user ?? null, loading: false });

      if (event === "SIGNED_IN" && session?.user) {
        if (!sessionStorage.getItem(SYNC_DONE_KEY)) {
          sessionStorage.setItem(SYNC_DONE_KEY, "true");
          useSyncStore.getState().initialSync();
        }
      }

      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem(SYNC_DONE_KEY);
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
