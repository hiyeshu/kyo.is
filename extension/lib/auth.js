/**
 * [INPUT]: chrome.identity API, Supabase REST API
 * [OUTPUT]: signIn, signOut, getSession, isLoggedIn, onAuthChange
 * [POS]: extension/lib 的认证层，Google OAuth → Supabase session
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// Supabase 配置（和主站共享同一个项目）
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"; // TODO: 从主站 .env 获取
const SUPABASE_ANON_KEY = ""; // TODO: 从主站 .env 获取

const AUTH_STORAGE_KEY = "kyo:auth-session";

// ─── Session 管理 ────────────────────────────────────────────────────────────

export async function getSession() {
  const result = await chrome.storage.local.get(AUTH_STORAGE_KEY);
  return result[AUTH_STORAGE_KEY] || null;
}

async function saveSession(session) {
  await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: session });
}

export async function clearSession() {
  await chrome.storage.local.remove(AUTH_STORAGE_KEY);
}

export async function isLoggedIn() {
  const session = await getSession();
  if (!session) return false;
  // 检查 token 是否过期
  const exp = session.expires_at;
  if (exp && Date.now() / 1000 > exp) {
    // 尝试刷新
    const refreshed = await refreshToken(session.refresh_token);
    return !!refreshed;
  }
  return true;
}

// ─── Google OAuth → Supabase ─────────────────────────────────────────────────

export async function signIn() {
  try {
    // 1. 用 chrome.identity 获取 Google OAuth token
    const token = await chrome.identity.getAuthToken({
      interactive: true,
      scopes: ["openid", "email", "profile"],
    });

    if (!token?.token) throw new Error("Failed to get Google token");

    // 2. 用 Google token 换 Supabase session
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=id_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        provider: "google",
        token: token.token,
      }),
    });

    if (!res.ok) throw new Error(`Supabase auth failed: ${res.status}`);

    const session = await res.json();
    await saveSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: session.user,
    });

    return session;
  } catch (err) {
    console.error("[kyo:auth] signIn failed:", err);
    return null;
  }
}

export async function signOut() {
  // 撤销 Chrome identity token
  try {
    const token = await chrome.identity.getAuthToken({ interactive: false });
    if (token?.token) {
      await chrome.identity.removeCachedAuthToken({ token: token.token });
    }
  } catch {}
  await clearSession();
}

// ─── Token 刷新 ──────────────────────────────────────────────────────────────

async function refreshToken(refreshToken) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
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

  // 提前 60s 刷新
  if (session.expires_at && Date.now() / 1000 > session.expires_at - 60) {
    const refreshed = await refreshToken(session.refresh_token);
    return refreshed?.access_token || null;
  }

  return session.access_token;
}
