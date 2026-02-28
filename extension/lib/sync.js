/**
 * [INPUT]: 依赖 lib/storage.js, lib/auth.js, lib/config.js, Supabase REST API
 * [OUTPUT]: pushBookmark, deleteBookmark, pullAll, initialSync, syncUnsynced
 * [POS]: extension/lib 的云同步层，直接写 Supabase kyo_items 表（与主站 cloudSync 同构）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { getAll, getUnsynced, markSynced, mergeFromCloud } from "./storage.js";
import { getAccessToken, getSession, isLoggedIn } from "./auth.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// ─── 并发控制 ─────────────────────────────────────────────────────────────────

const CONCURRENCY = 5;

/**
 * 限制并发执行异步任务
 * @template T
 * @param {Array<T>} items
 * @param {(item: T) => Promise<boolean>} fn
 * @param {number} limit
 * @returns {Promise<number>} 成功数
 */
async function mapConcurrent(items, fn, limit = CONCURRENCY) {
  let ok = 0;
  let i = 0;
  const run = async () => {
    while (i < items.length) {
      const item = items[i++];
      if (await fn(item)) ok++;
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return ok;
}

// ─── Supabase REST 辅助 ───────────────────────────────────────────────────────

/**
 * @param {string} table
 * @param {{ method?: string, body?: Object, query?: string }} opts
 * @returns {Promise<Object|Array|null>}
 */
async function supabaseRest(table, { method = "GET", body, query = "" } = {}) {
  const token = await getAccessToken();
  if (!token) return null;

  const headers = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
  };
  if (method !== "GET") headers["Prefer"] = "return=representation";

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[kyo:sync] ${method} ${table} failed:`, res.status, err);
    return null;
  }
  return res.json();
}

// ─── 推送单个书签（查重后 insert 或 update）──────────────────────────────────

/**
 * @param {Object} bookmark
 * @returns {Promise<boolean>}
 */
export async function pushBookmark(bookmark) {
  if (!(await isLoggedIn())) return false;

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return false;

  const existing = await supabaseRest("kyo_items", {
    query: `?user_id=eq.${userId}&url=eq.${encodeURIComponent(bookmark.url)}&select=id&limit=1`,
  });

  const payload = {
    user_id: userId,
    type: "bookmark",
    url: bookmark.url,
    title: bookmark.title || "",
    summary: bookmark.summary || "",
    favicon: bookmark.favicon || "",
    tags: bookmark.tags || [],
    on_desktop: true,
  };

  let result;
  if (existing?.length) {
    result = await supabaseRest("kyo_items", {
      method: "PATCH",
      query: `?id=eq.${existing[0].id}`,
      body: {
        title: payload.title,
        summary: payload.summary,
        favicon: payload.favicon,
        tags: payload.tags,
      },
    });
  } else {
    result = await supabaseRest("kyo_items", {
      method: "POST",
      body: payload,
    });
  }

  if (result) {
    await markSynced(bookmark.id);
    return true;
  }
  return false;
}

// ─── 拉取云端所有书签 ─────────────────────────────────────────────────────────

/**
 * @returns {Promise<Array<Object>>}
 */
export async function pullAll() {
  if (!(await isLoggedIn())) return [];

  const data = await supabaseRest("kyo_items", {
    query: "?type=eq.bookmark&order=created_at.desc",
  });
  if (!data) return [];

  return data.map((b) => ({
    id: b.id,
    title: b.title || "",
    url: b.url || "",
    summary: b.summary || "",
    tags: b.tags || [],
    favicon: b.favicon || "",
    createdAt: b.created_at,
    onDesktop: b.on_desktop ?? true,
    inDock: false,
  }));
}

// ─── 删除云端书签 ─────────────────────────────────────────────────────────────

/**
 * @param {Object} bookmark
 */
export async function deleteBookmark(bookmark) {
  if (!(await isLoggedIn())) return;

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  await supabaseRest("kyo_items", {
    method: "DELETE",
    query: `?user_id=eq.${userId}&url=eq.${encodeURIComponent(bookmark.url)}`,
  });
}

// ─── 初始同步（登录后触发）───────────────────────────────────────────────────

/**
 * @returns {Promise<{ uploaded: number, downloaded: number }>}
 */
export async function initialSync() {
  if (!(await isLoggedIn())) return { uploaded: 0, downloaded: 0 };

  const cloudBookmarks = await pullAll();
  const downloaded = await mergeFromCloud(cloudBookmarks);

  const unsynced = await getUnsynced();
  const uploaded = await mapConcurrent(unsynced, pushBookmark);

  console.log(`[kyo:sync] initialSync done: ↑${uploaded} ↓${downloaded}`);
  return { uploaded, downloaded };
}

// ─── 同步所有未同步的书签 ─────────────────────────────────────────────────────

/**
 * @returns {Promise<number>} 成功同步数
 */
export async function syncUnsynced() {
  if (!(await isLoggedIn())) return 0;
  const unsynced = await getUnsynced();
  return mapConcurrent(unsynced, pushBookmark);
}
