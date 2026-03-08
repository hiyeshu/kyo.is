/**
 * [INPUT]: 依赖 _utils 的 Supabase 工具，接收 PATCH { title?, summary?, text?, tags?, on_desktop? }
 * [OUTPUT]: 返回更新后的 kyo_item 记录；DELETE 返回 204
 * [POS]: api/ 的单条数据更新/删除端点，被前端编辑和移除逻辑消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createSupabaseFromRequest, json, error } from "../_utils.js";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  const { client } = createSupabaseFromRequest(req);

  const { data: { user }, error: authErr } = await client.auth.getUser();
  if (authErr || !user) return error("Unauthorized", 401);

  // 从 URL 路径提取 id: /api/items/[id]
  const id = new URL(req.url).pathname.split("/").pop();
  if (!id) return error("Missing item id");

  if (req.method === "PATCH") {
    const body = await req.json();
    const allowed = ["title", "summary", "text", "tags", "on_desktop", "url", "favicon"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    if (Object.keys(updates).length === 0) return error("No valid fields to update");

    const { data, error: dbErr } = await client
      .from("kyo_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (dbErr) return error(dbErr.message, 500);
    return json(data);
  }

  if (req.method === "DELETE") {
    const { error: dbErr } = await client
      .from("kyo_items")
      .delete()
      .eq("id", id);

    if (dbErr) return error(dbErr.message, 500);
    return new Response(null, { status: 204 });
  }

  return error("Method not allowed", 405);
}
