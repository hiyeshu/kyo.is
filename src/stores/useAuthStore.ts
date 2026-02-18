/**
 * [INPUT]: 依赖 @/lib/supabase 的客户端
 * [OUTPUT]: 对外提供 useAuthStore — user / loading / signInWithGoogle / signOut
 * [POS]: stores/ 的认证状态管理，被 App.tsx 和 AppleMenu 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

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
      set({ user: data.session?.user ?? null, loading: false });
    });

    supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      set({ user: session?.user ?? null, loading: false });
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
