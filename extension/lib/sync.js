/**
 * [INPUT]: 依赖 lib/storage.js, lib/auth.js, kyo.is API 端点
 * [OUTPUT]: pushBookmark, pullAll, initialSync, syncUnsynced
 * [POS]: extension/lib 的云同步层，登录后双向同步 + 未登录书签无感迁移
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { getAll, getUnsynced, markSynced, mergeFromCloud } from "./storage.js";
import { getAccessToken, isLoggedIn } from "./auth.js";

const API_BASE = "https://kyo.is/api";

// ─── 辅助：带认证的 fetch ────────────────────────────────────────────────────

async function authFetch(path, options = {}) {
  const token = await getAccessToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    console.error(`[kyo:sync] ${path} failed:`, res.status);
    return null;
  }
  return res.json();
}

// ─── 推送单个书签到云端 ──────────────────────────────────────────────────────

export async function pushBookmark(bookmark) {
  if (!(await isLoggedIn())) return false;

  const result = await authFetch("/save", {
    method: "POST",
    body: JSON.stringify({
      type: "bookmark",
      url: bookmark.url,
      title: bookmark.title,
      summary: bookmark.summary || "",
      favicon: bookmark.favicon || "",
      tags: bookmark.tags || [],
    }),
  });

  if (result) {
    await markSynced(bookmark.id);
    return true;
  }
  return false;
}

// ─── 拉取云端所有书签 ────────────────────────────────────────────────────────

export async function pullAll() {
  if (!(await isLoggedIn())) return [];

  const result = await authFetch("/sync", { method: "GET" });
  if (!result?.items) return [];

  // 只取 bookmark 类型
  return result.items
    .filter((item) => item.type === "bookmark")
    .map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      summary: item.summary || "",
      tags: item.tags || [],
      favicon: item.favicon || "",
      createdAt: item.created_at,
      onDesktop: item.on_desktop ?? true,
      inDock: item.in_dock ?? false,
    }));
}

// ─── 初始同步（登录后触发）──────────────────────────────────────────────────
// 三种用户状态的核心逻辑：
// 1. 本地有、云端没有 → 上传（无感迁移）
// 2. 云端有、本地没有 → 下载
// 3. 两边都有（同 URL）→ 保留两边，不覆盖

export async function initialSync() {
  if (!(await isLoggedIn())) return { uploaded: 0, downloaded: 0 };

  // 拉取云端
  const cloudBookmarks = await pullAll();

  // 合并云端 → 本地（云端有、本地没有的）
  const downloaded = await mergeFromCloud(cloudBookmarks);

  // 推送本地未同步的 → 云端（本地有、云端没有的）
  const unsynced = await getUnsynced();
  let uploaded = 0;
  for (const bookmark of unsynced) {
    const ok = await pushBookmark(bookmark);
    if (ok) uploaded++;
  }

  console.log(`[kyo:sync] initialSync done: ↑${uploaded} ↓${downloaded}`);
  return { uploaded, downloaded };
}

// ─── 同步所有未同步的书签 ────────────────────────────────────────────────────

export async function syncUnsynced() {
  if (!(await isLoggedIn())) return 0;

  const unsynced = await getUnsynced();
  let count = 0;
  for (const bookmark of unsynced) {
    const ok = await pushBookmark(bookmark);
    if (ok) count++;
  }
  return count;
}
