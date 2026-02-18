/**
 * [INPUT]: 依赖 _utils 的 Supabase 工具，接收 GET/POST 请求
 * [OUTPUT]: GET 返回云端所有数据，POST 批量上传本地数据
 * [POS]: api/ 的数据同步端点，被 useSyncStore 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createSupabaseFromRequest, json, error } from "./_utils.js";

export const config = { runtime: "edge" };

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

interface LocalBookmark {
  id: string;
  title: string;
  url: string;
  summary?: string;
  tags?: string[];
  favicon?: string;
  createdAt?: string;
  onDesktop?: boolean;
}

interface LocalNote {
  id: string;
  content: string;
  color: string;
  tags?: string[];
  onDesktop?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

interface SyncPayload {
  bookmarks?: LocalBookmark[];
  notes?: LocalNote[];
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: Request) {
  const { client } = createSupabaseFromRequest(req);

  // 验证用户身份
  const { data: { user }, error: authErr } = await client.auth.getUser();
  if (authErr || !user) return error("Unauthorized", 401);

  // ─── GET: 获取云端所有数据 ─────────────────────────────────────────────────
  if (req.method === "GET") {
    const { data, error: dbErr } = await client
      .from("kyo_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbErr) return error(dbErr.message, 500);

    // 分离书签和便签
    const bookmarks = data?.filter(item => item.type === "bookmark") || [];
    const notes = data?.filter(item => item.type === "note") || [];

    return json({
      bookmarks: bookmarks.map(b => ({
        id: b.id,
        title: b.title || "",
        url: b.url || "",
        summary: b.summary || "",
        tags: b.tags || [],
        favicon: b.favicon || "",
        createdAt: b.created_at,
        onDesktop: b.on_desktop || false,
      })),
      notes: notes.map(n => ({
        id: n.id,
        content: n.text || "",
        color: n.color || "yellow",
        tags: n.tags || [],
        onDesktop: n.on_desktop || false,
        createdAt: new Date(n.created_at).getTime(),
        updatedAt: new Date(n.updated_at || n.created_at).getTime(),
      })),
      count: {
        bookmarks: bookmarks.length,
        notes: notes.length,
      },
    });
  }

  // ─── POST: 批量上传本地数据 ─────────────────────────────────────────────────
  if (req.method === "POST") {
    const body = await req.json() as SyncPayload;
    const { bookmarks = [], notes = [] } = body;

    // 准备插入数据
    const itemsToInsert = [
      ...bookmarks.map(b => ({
        user_id: user.id,
        type: "bookmark" as const,
        url: b.url,
        title: b.title,
        summary: b.summary || null,
        favicon: b.favicon || null,
        tags: b.tags || [],
        on_desktop: b.onDesktop || false,
        created_at: b.createdAt || new Date().toISOString(),
      })),
      ...notes.map(n => ({
        user_id: user.id,
        type: "note" as const,
        text: n.content,
        color: n.color || "yellow",
        tags: n.tags || [],
        on_desktop: n.onDesktop || false,
        created_at: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
        updated_at: n.updatedAt ? new Date(n.updatedAt).toISOString() : new Date().toISOString(),
      })),
    ];

    if (itemsToInsert.length === 0) {
      return json({ uploaded: 0 });
    }

    // 对于书签，用 url 去重；对于便签，直接插入
    // 使用 ON CONFLICT DO NOTHING 避免重复
    const { error: dbErr, count } = await client
      .from("kyo_items")
      .upsert(itemsToInsert, {
        onConflict: "user_id,url",
        ignoreDuplicates: true,
      });

    if (dbErr) return error(dbErr.message, 500);

    return json({ uploaded: count || itemsToInsert.length }, 201);
  }

  // ─── DELETE: 清空云端数据（危险操作，用于"使用本地数据覆盖"场景） ──────────
  if (req.method === "DELETE") {
    const { error: dbErr } = await client
      .from("kyo_items")
      .delete()
      .eq("user_id", user.id);

    if (dbErr) return error(dbErr.message, 500);
    return new Response(null, { status: 204 });
  }

  return error("Method not allowed", 405);
}
