/**
 * [INPUT]: 依赖 @supabase/supabase-js，依赖环境变量 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * [OUTPUT]: 对外提供 supabase 客户端单例
 * [POS]: lib/ 的 Supabase 初始化，被 useAuthStore 和 API 层消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
