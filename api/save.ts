/**
 * [INPUT]: 依赖 _utils 的 Supabase 工具，接收 POST { type, url?, title?, summary?, favicon?, text?, tags? }
 * [OUTPUT]: 返回创建的 kyo_item 记录
 * [POS]: api/ 的数据写入端点，被前端书签/便签保存逻辑消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createSupabaseFromRequest, json, error } from "./_utils";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "POST") return error("Method not allowed", 405);

  const { client } = createSupabaseFromRequest(req);

  // 验证用户身份
  const { data: { user }, error: authErr } = await client.auth.getUser();
  if (authErr || !user) return error("Unauthorized", 401);

  const body = await req.json();
  const { type, url, title, summary, favicon, text, tags } = body;

  if (!type || !["bookmark", "note"].includes(type)) {
    return error("type must be 'bookmark' or 'note'");
  }

  const { data, error: dbErr } = await client
    .from("kyo_items")
    .insert({
      user_id: user.id,
      type,
      url: url || null,
      title: title || null,
      summary: summary || null,
      favicon: favicon || null,
      text: text || null,
      tags: tags || [],
    })
    .select()
    .single();

  if (dbErr) return error(dbErr.message, 500);
  return json(data, 201);
}
