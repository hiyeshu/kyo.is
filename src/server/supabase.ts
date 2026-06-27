/**
 * [INPUT]: 依赖 @supabase/supabase-js，依赖 ./types 的 KyoWorkerEnv
 * [OUTPUT]: createUserSupabase / createServiceSupabase / requireUser，提供用户作用域与服务端 Supabase 客户端
 * [POS]: server/ 的数据访问入口，被 worker 路由与 Mastra tools 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { KyoWorkerEnv } from "./types";
import { readBearerToken } from "./http";

export interface UserSupabaseContext {
  client: SupabaseClient;
  token: string;
}

export function createUserSupabase(
  request: Request,
  env: KyoWorkerEnv
): UserSupabaseContext | null {
  const token = readBearerToken(request);
  if (!token) return null;

  return {
    token,
    client: createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    }),
  };
}

export function createServiceSupabase(env: KyoWorkerEnv): SupabaseClient | null {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;

  return createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export async function requireUser(client: SupabaseClient): Promise<User> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user;
}
