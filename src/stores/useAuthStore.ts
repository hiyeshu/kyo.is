/**
 * [INPUT]: 依赖 @/lib/supabase 的客户端，依赖 useSyncStore 的同步检测
 * [OUTPUT]: 对外提供 useAuthStore — user / loading / signInWithGoogle / signOut
 * [POS]: stores/ 的认证状态管理，被 App.tsx 和 AppleMenu 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useSyncStore } from "./useSyncStore";

// 记录是否已经对当前会话执行过同步检测
const SYNC_CHECKED_KEY = "kyo:sync-checked-session";

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
      
      // 首次加载时，如果已登录且未检查过同步，触发同步检测
      if (user) {
        const checkedSession = sessionStorage.getItem(SYNC_CHECKED_KEY);
        if (!checkedSession) {
          sessionStorage.setItem(SYNC_CHECKED_KEY, "true");
          useSyncStore.getState().checkSyncStatus();
        }
      }
    });

    supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      set({ user: session?.user ?? null, loading: false });
      
      // SIGNED_IN 事件：用户刚刚登录（OAuth 重定向回来）
      if (event === "SIGNED_IN" && session?.user) {
        const checkedSession = sessionStorage.getItem(SYNC_CHECKED_KEY);
        if (!checkedSession) {
          sessionStorage.setItem(SYNC_CHECKED_KEY, "true");
          useSyncStore.getState().checkSyncStatus();
        }
      }
      
      // SIGNED_OUT 事件：清除标记，下次登录重新检测
      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem(SYNC_CHECKED_KEY);
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
