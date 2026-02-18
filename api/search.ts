/**
 * [INPUT]: 依赖 _utils 的 Supabase 工具，接收 GET ?q=关键词&limit=20&offset=0
 * [OUTPUT]: 返回匹配的 kyo_item 列表
 * [POS]: api/ 的全文搜索端点，被前端搜索功能消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createSupabaseFromRequest, json, error } from "./_utils";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "GET") return error("Method not allowed", 405);

  const { client } = createSupabaseFromRequest(req);

  const { data: { user }, error: authErr } = await client.auth.getUser();
  if (authErr || !user) return error("Unauthorized", 401);

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 100);
  const offset = Number(url.searchParams.get("offset")) || 0;

  let query = client
    .from("kyo_items")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // 有搜索词时使用全文搜索
  if (q) {
    query = query.textSearch(
      "title,summary,text",
      q,
      { type: "websearch", config: "simple" }
    );
  }

  const { data, error: dbErr } = await query;
  if (dbErr) return error(dbErr.message, 500);
  return json(data);
}
