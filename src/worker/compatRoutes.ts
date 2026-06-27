/**
 * [INPUT]: 依赖 ../server/http/supabase/linkMeta/types 与 Supabase user-scoped client
 * [OUTPUT]: 旧 /api/* 的 Cloudflare Worker 兼容处理函数，承接 scrape、preview、items、sync，并保留 orderIndex 排序字段
 * [POS]: worker/ 的兼容路由层，把旧 API 职责收束进 Worker，避免生产入口分裂
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { errorJson, json } from "../server/http";
import { resolveLinkMeta } from "../server/linkMeta";
import { createUserSupabase, requireUser } from "../server/supabase";
import type { ExecutionContextLike, KyoWorkerEnv } from "../server/types";

const PAGESHOT_ENDPOINT = "https://pageshot.site/v1/screenshot";

interface AuthContext {
  client: SupabaseClient;
  userId: string;
}

interface SavePayload extends Record<string, unknown> {
  type?: "bookmark" | "note";
  url?: string;
  title?: string;
  summary?: string;
  favicon?: string;
  text?: string;
  color?: string;
  tags?: string[];
  onDesktop?: boolean;
  inDock?: boolean;
  orderIndex?: number;
}

interface SyncPayload {
  bookmarks?: Array<Record<string, unknown>>;
  notes?: Array<Record<string, unknown>>;
}

export async function handleScrape(
  request: Request,
  env: KyoWorkerEnv,
  ctx: ExecutionContextLike
): Promise<Response> {
  if (request.method !== "POST") return errorJson("Method not allowed", 405);

  try {
    const body = (await request.json()) as { url?: string; no_cache?: boolean; lang?: string };
    if (!body.url) return errorJson("Missing url");

    const { result, cacheWrite } = await resolveLinkMeta(env, {
      url: body.url,
      noCache: body.no_cache,
      lang: body.lang,
    });

    if (cacheWrite) ctx.waitUntil(cacheWrite.catch(() => undefined));
    return json(result);
  } catch (error) {
    return routeError(error, "Scrape failed");
  }
}

export async function handleBookmarkPreview(request: Request): Promise<Response> {
  if (request.method !== "GET") return errorJson("Method not allowed", 405);

  const url = new URL(request.url);
  const target = normalizeHttpUrl(url.searchParams.get("url"));
  if (!target) return errorJson("Invalid url");

  const upstreamUrl = `${PAGESHOT_ENDPOINT}?${buildPreviewParams(url.searchParams, target)}`;
  try {
    const upstream = await fetch(upstreamUrl);
    const contentType = upstream.headers.get("Content-Type") || "image/webp";
    if (!upstream.ok || !upstream.body || !contentType.startsWith("image/")) {
      return errorJson("Preview fetch failed", upstream.status || 502);
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=21600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return errorJson("Preview proxy unavailable", 502);
  }
}

export function handleAudioTranscribe(request: Request): Response {
  if (request.method !== "POST") return errorJson("Method not allowed", 405);
  return errorJson("Audio transcription requires a configured speech-to-text provider", 501);
}

export async function handleSave(request: Request, env: KyoWorkerEnv): Promise<Response> {
  if (request.method !== "POST") return errorJson("Method not allowed", 405);

  try {
    const auth = await getAuth(request, env);
    if (auth instanceof Response) return auth;

    const body = (await request.json()) as SavePayload;
    if (!body.type || !["bookmark", "note"].includes(body.type)) {
      return errorJson("type must be 'bookmark' or 'note'");
    }

    if (body.type === "bookmark" && body.url) {
      const existing = await findBookmark(auth.client, auth.userId, body.url);
      if (existing?.id) return updateItem(auth.client, auth.userId, existing.id, toItemUpdate(body));
    }

    const { data, error } = await auth.client
      .from("kyo_items")
      .insert(toItemInsert(auth.userId, body))
      .select()
      .single();

    if (error) throw error;
    return json(data, 201);
  } catch (error) {
    return routeError(error);
  }
}

export async function handleSearch(request: Request, env: KyoWorkerEnv): Promise<Response> {
  if (request.method !== "GET") return errorJson("Method not allowed", 405);

  try {
    const auth = await getAuth(request, env);
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const q = sanitizeSearch(url.searchParams.get("q") || "");
    const limit = clampInt(url.searchParams.get("limit"), 20, 1, 100);
    const offset = clampInt(url.searchParams.get("offset"), 0, 0, 10_000);

    let query = auth.client
      .from("kyo_items")
      .select("*")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (q) query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%,text.ilike.%${q}%`);
    const { data, error } = await query;
    if (error) throw error;
    return json(data ?? []);
  } catch (error) {
    return routeError(error);
  }
}

export async function handleSync(request: Request, env: KyoWorkerEnv): Promise<Response> {
  try {
    const auth = await getAuth(request, env);
    if (auth instanceof Response) return auth;

    if (request.method === "GET") return readSync(auth);
    if (request.method === "POST") return writeSync(request, auth);
    if (request.method === "DELETE") return deleteSync(auth);
    return errorJson("Method not allowed", 405);
  } catch (error) {
    return routeError(error);
  }
}

export async function handleItemById(
  request: Request,
  env: KyoWorkerEnv,
  itemId: string
): Promise<Response> {
  try {
    const auth = await getAuth(request, env);
    if (auth instanceof Response) return auth;

    if (request.method === "PATCH") {
      const body = (await request.json()) as Record<string, unknown>;
      const updates = toItemUpdate(body);
      if (Object.keys(updates).length === 0) return errorJson("No valid fields to update");
      return updateItem(auth.client, auth.userId, itemId, updates);
    }

    if (request.method === "DELETE") {
      const { error } = await auth.client
        .from("kyo_items")
        .delete()
        .eq("id", itemId)
        .eq("user_id", auth.userId);
      if (error) throw error;
      return new Response(null, { status: 204 });
    }

    return errorJson("Method not allowed", 405);
  } catch (error) {
    return routeError(error);
  }
}

async function getAuth(request: Request, env: KyoWorkerEnv): Promise<AuthContext | Response> {
  const auth = createUserSupabase(request, env);
  if (!auth) return errorJson("Unauthorized", 401);
  const user = await requireUser(auth.client);
  return { client: auth.client, userId: user.id };
}

async function findBookmark(client: SupabaseClient, userId: string, url: string) {
  const { data, error } = await client
    .from("kyo_items")
    .select("id")
    .eq("user_id", userId)
    .eq("url", url)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string } | null;
}

function toItemInsert(userId: string, body: SavePayload): Record<string, unknown> {
  return {
    user_id: userId,
    type: body.type,
    url: body.url || null,
    title: body.title || null,
    summary: body.summary || null,
    favicon: body.favicon || null,
    text: body.text || null,
    color: body.color || null,
    tags: body.tags || [],
    on_desktop: body.onDesktop || false,
    in_dock: body.inDock || false,
    order_index: body.orderIndex ?? 0,
  };
}

async function updateItem(
  client: SupabaseClient,
  userId: string,
  itemId: string,
  updates: Record<string, unknown>
): Promise<Response> {
  const { data, error } = await client
    .from("kyo_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return json(data);
}

async function readSync(auth: AuthContext): Promise<Response> {
  const { data, error } = await auth.client
    .from("kyo_items")
    .select("*")
    .eq("user_id", auth.userId)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;

  const items = data ?? [];
  const bookmarks = items.filter((item) => item.type === "bookmark");
  const notes = items.filter((item) => item.type === "note");
  return json({ bookmarks: bookmarks.map(toBookmark), notes: notes.map(toNote) });
}

async function writeSync(request: Request, auth: AuthContext): Promise<Response> {
  const body = (await request.json()) as SyncPayload;
  const items = [
    ...(body.bookmarks ?? []).map((bookmark) => toBookmarkInsert(auth.userId, bookmark)),
    ...(body.notes ?? []).map((note) => toNoteInsert(auth.userId, note)),
  ];

  if (items.length === 0) return json({ uploaded: 0 });
  const { error } = await auth.client.from("kyo_items").insert(items);
  if (error) throw error;
  return json({ uploaded: items.length }, 201);
}

async function deleteSync(auth: AuthContext): Promise<Response> {
  const { error } = await auth.client.from("kyo_items").delete().eq("user_id", auth.userId);
  if (error) throw error;
  return new Response(null, { status: 204 });
}

function toBookmark(item: Record<string, unknown>) {
  return {
    id: item.id,
    title: item.title || "",
    url: item.url || "",
    summary: item.summary || "",
    tags: item.tags || [],
    favicon: item.favicon || "",
    createdAt: item.created_at,
    orderIndex: item.order_index ?? 0,
    onDesktop: item.on_desktop || false,
  };
}

function toNote(item: Record<string, unknown>) {
  return {
    id: item.id,
    content: item.text || "",
    color: item.color || "yellow",
    tags: item.tags || [],
    onDesktop: item.on_desktop || false,
    orderIndex: item.order_index ?? 0,
    createdAt: new Date(String(item.created_at)).getTime(),
    updatedAt: new Date(String(item.updated_at || item.created_at)).getTime(),
  };
}

function toBookmarkInsert(userId: string, bookmark: Record<string, unknown>) {
  return {
    user_id: userId,
    type: "bookmark",
    url: bookmark.url,
    title: bookmark.title,
    summary: bookmark.summary || null,
    favicon: bookmark.favicon || null,
    tags: bookmark.tags || [],
    on_desktop: bookmark.onDesktop || false,
    in_dock: bookmark.inDock || false,
    order_index: bookmark.orderIndex ?? 0,
    created_at: bookmark.createdAt || new Date().toISOString(),
  };
}

function toNoteInsert(userId: string, note: Record<string, unknown>) {
  return {
    user_id: userId,
    type: "note",
    text: note.content,
    color: note.color || "yellow",
    tags: note.tags || [],
    on_desktop: note.onDesktop || false,
    order_index: note.orderIndex ?? 0,
    created_at: numberToDate(note.createdAt),
    updated_at: numberToDate(note.updatedAt),
  };
}

function numberToDate(value: unknown): string {
  return typeof value === "number" ? new Date(value).toISOString() : new Date().toISOString();
}

function toItemUpdate(body: Record<string, unknown>): Record<string, unknown> {
  const mapping: Record<string, string> = {
    title: "title",
    summary: "summary",
    text: "text",
    tags: "tags",
    url: "url",
    favicon: "favicon",
    color: "color",
    onDesktop: "on_desktop",
    inDock: "in_dock",
    on_desktop: "on_desktop",
    in_dock: "in_dock",
    orderIndex: "order_index",
    order_index: "order_index",
  };

  return Object.fromEntries(
    Object.entries(mapping)
      .filter(([key]) => key in body)
      .map(([key, column]) => [column, body[key]])
  );
}

function normalizeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function buildPreviewParams(searchParams: URLSearchParams, url: string): string {
  return new URLSearchParams({
    url,
    width: String(clampInt(searchParams.get("width"), 800, 320, 3840)),
    height: String(clampInt(searchParams.get("height"), 500, 200, 2160)),
    format: normalizeFormat(searchParams.get("format")),
    quality: String(clampInt(searchParams.get("quality"), 70, 1, 100)),
    block_ads: normalizeBool(searchParams.get("block_ads"), true),
    timeout: String(clampInt(searchParams.get("timeout"), 15_000, 5_000, 60_000)),
  }).toString();
}

function clampInt(value: string | null, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeBool(value: string | null, fallback: boolean): string {
  if (value === null) return fallback ? "true" : "false";
  return value === "true" ? "true" : "false";
}

function normalizeFormat(value: string | null): string {
  return value === "png" || value === "jpeg" || value === "webp" ? value : "webp";
}

function sanitizeSearch(value: string): string {
  return value.trim().replace(/[%,]/g, "").slice(0, 120);
}

function routeError(error: unknown, fallback = "Internal server error"): Response {
  const message = error instanceof Error ? error.message : fallback;
  const status = message === "Unauthorized" ? 401 : 500;
  return errorJson(message || fallback, status);
}
