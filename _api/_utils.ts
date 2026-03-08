/**
 * [INPUT]: 依赖环境变量 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，依赖请求 Authorization header
 * [OUTPUT]: 对外提供 createSupabaseFromRequest 工具函数
 * [POS]: api/ 的认证工具，被 save/search/items 端点消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

export function createSupabaseFromRequest(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  return {
    client: createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    }),
    token,
  };
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function error(message: string, status = 400) {
  return json({ error: message }, status);
}
