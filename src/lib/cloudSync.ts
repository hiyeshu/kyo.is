/**
 * [INPUT]: 依赖 @/lib/supabase 客户端
 * [OUTPUT]: 对外提供 cloud* 系列函数 — 书签/便签的云端 CRUD + 全量拉取/上传
 * [POS]: lib/ 的云端数据层，被 useBookmarkStore / useStickiesStore / useSyncStore 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { supabase } from "./supabase";

// ─── 认证辅助 ─────────────────────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id ?? null;
  if (!uid) console.warn("[cloudSync] no auth session — cloud write skipped");
  return uid;
}

// ─── 通用 CRUD ──────────────────────────────────────────────────────────────

export async function cloudUpsertItem(item: Record<string, unknown>) {
  const userId = await getUserId();
  if (!userId) return;
  const payload: Record<string, unknown> = { ...item, user_id: userId };

  // 先按 id 查是否已存在，存在则 update，否则 insert
  // 避免 upsert 的 onConflict 与唯一索引不匹配
  const { data: existing } = await supabase
    .from("kyo_items")
    .select("id")
    .eq("id", payload.id as string)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("kyo_items")
      .update(payload)
      .eq("id", payload.id as string);
    if (error) console.error("[cloudSync] update failed:", error.code, error.message);
  } else {
    const { error } = await supabase.from("kyo_items").insert(payload);
    if (error) {
      // 23505 = 唯一约束冲突（同 URL 已存在），降级为按 user_id+url 更新
      if (error.code === "23505" && payload.url) {
        const { error: e2 } = await supabase
          .from("kyo_items")
          .update(payload)
          .eq("user_id", userId)
          .eq("url", payload.url as string);
        if (e2) console.error("[cloudSync] fallback update failed:", e2.code, e2.message);
      } else {
        console.error("[cloudSync] insert failed:", error.code, error.message);
      }
    }
  }
}

export async function cloudDeleteItem(id: string) {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase.from("kyo_items").delete().eq("id", id);
  if (error) console.error("[cloudSync] delete failed:", error.message, { id });
}

export async function cloudDeleteByType(type: "bookmark" | "note") {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from("kyo_items").delete().eq("user_id", userId).eq("type", type);
}

export async function cloudDeleteAll() {
  const userId = await getUserId();
  if (!userId) return;
  await supabase.from("kyo_items").delete().eq("user_id", userId);
}

// ─── 全量拉取 ───────────────────────────────────────────────────────────────

export interface CloudBookmarkRaw {
  id: string;
  title: string | null;
  url: string | null;
  summary: string | null;
  favicon: string | null;
  tags: string[] | null;
  on_desktop: boolean | null;
  in_dock: boolean | null;
  created_at: string;
}

export interface CloudNoteRaw {
  id: string;
  text: string | null;
  color: string | null;
  tags: string[] | null;
  on_desktop: boolean | null;
  created_at: string;
  updated_at: string | null;
}

export interface CloudFetchResult {
  bookmarks: CloudBookmarkRaw[];
  notes: CloudNoteRaw[];
}

export async function cloudFetchAll(): Promise<CloudFetchResult | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("kyo_items")
    .select("*")
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("[cloudSync] fetchAll failed:", error?.message);
    return null;
  }

  const result = {
    bookmarks: data.filter((i: { type: string }) => i.type === "bookmark"),
    notes: data.filter((i: { type: string }) => i.type === "note"),
  };
  return result;
}

// ─── 批量上传（首次登录用） ─────────────────────────────────────────────────

export async function cloudBatchInsert(items: Record<string, unknown>[]) {
  const userId = await getUserId();
  if (!userId || items.length === 0) return;

  const withUser = items.map((item) => ({ ...item, user_id: userId }));
  const { error } = await supabase.from("kyo_items").insert(withUser);
  if (error) console.error("[cloudSync] batchInsert failed:", error.message, { count: items.length });
}
