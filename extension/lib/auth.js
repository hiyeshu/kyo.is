/**
 * [INPUT]: chrome.storage.local, Supabase REST API, lib/config.js
 * [OUTPUT]: getSession, saveSession, clearSession, isLoggedIn, getAccessToken
 * [POS]: extension/lib 的认证层，session 由 newtab iframe 桥接写入，本模块只读取和刷新
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_KEYS } from "./config.js";

const KEY = STORAGE_KEYS.AUTH_SESSION;

// ─── Session 管理 ─────────────────────────────────────────────────────────────

/**
 * @returns {Promise<Object|null>} 当前 session，不存在返回 null
 */
export async function getSession() {
  const result = await chrome.storage.local.get(KEY);
  return result[KEY] || null;
}

/**
 * @param {Object} session - Supabase auth session
 */
export async function saveSession(session) {
  await chrome.storage.local.set({ [KEY]: session });
}

export async function clearSession() {
  await chrome.storage.local.remove(KEY);
}

/**
 * 检查是否已登录，过期则尝试刷新
 * @returns {Promise<boolean>}
 */
export async function isLoggedIn() {
  const session = await getSession();
  if (!session) return false;
  const exp = session.expires_at;
  if (exp && Date.now() / 1000 > exp) {
    const refreshed = await refreshToken(session.refresh_token);
    return !!refreshed;
  }
  return true;
}

// ─── Token 刷新 ───────────────────────────────────────────────────────────────

/**
 * @param {string} token - refresh_token
 * @returns {Promise<Object|null>} 刷新后的 session，失败返回 null
 */
async function refreshToken(token) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: token }),
    });

    if (!res.ok) {
      await clearSession();
      return null;
    }

    const session = await res.json();
    await saveSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: session.user,
    });
    return session;
  } catch {
    await clearSession();
    return null;
  }
}

// ─── 获取有效 access_token（自动刷新）─────────────────────────────────────────

/**
 * 获取有效 access_token，过期前 60s 自动刷新
 * @returns {Promise<string|null>}
 */
export async function getAccessToken() {
  const session = await getSession();
  if (!session) return null;

  if (session.expires_at && Date.now() / 1000 > session.expires_at - 60) {
    const refreshed = await refreshToken(session.refresh_token);
    return refreshed?.access_token || null;
  }

  return session.access_token;
}
