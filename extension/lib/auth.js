/**
 * [INPUT]: chrome.storage.local, Supabase REST API
 * [OUTPUT]: getSession, clearSession, isLoggedIn, getAccessToken
 * [POS]: extension/lib 的认证层，session 由 newtab iframe 桥接写入，本模块只读取和刷新
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ─── 配置 ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = "https://icrcrtriimlfyqwuonnz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3dc-PxcnVxabpjwHPED9Rg_PT-2aNXg";
const AUTH_STORAGE_KEY = "kyo:auth-session";

// ─── Session 管理 ────────────────────────────────────────────────────────────

export async function getSession() {
  const result = await chrome.storage.local.get(AUTH_STORAGE_KEY);
  return result[AUTH_STORAGE_KEY] || null;
}

export async function saveSession(session) {
  await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: session });
}

export async function clearSession() {
  await chrome.storage.local.remove(AUTH_STORAGE_KEY);
}

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

// ─── Token 刷新 ──────────────────────────────────────────────────────────────

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

// ─── 获取有效 access_token（自动刷新）────────────────────────────────────────

export async function getAccessToken() {
  const session = await getSession();
  if (!session) return null;

  if (session.expires_at && Date.now() / 1000 > session.expires_at - 60) {
    const refreshed = await refreshToken(session.refresh_token);
    return refreshed?.access_token || null;
  }

  return session.access_token;
}
