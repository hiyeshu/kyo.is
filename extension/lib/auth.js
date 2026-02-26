/**
 * [INPUT]: chrome.identity API, Supabase REST API
 * [OUTPUT]: signIn, signOut, getSession, isLoggedIn, getAccessToken
 * [POS]: extension/lib 的认证层，Google OAuth → Supabase session
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ─── 配置 ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = "https://icrcrtriimlfyqwuonnz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3dc-PxcnVxabpjwHPED9Rg_PT-2aNXg";
// 复用主站 kyo.is 的 Web Application OAuth Client
const GOOGLE_CLIENT_ID = "78750573362-gjddp8mdv4j7senpmepne6b3up94pqfi.apps.googleusercontent.com";
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
  const exp = session.expires_at;
  if (exp && Date.now() / 1000 > exp) {
    const refreshed = await refreshToken(session.refresh_token);
    return !!refreshed;
  }
  return true;
}

// ─── Google OAuth → Supabase ─────────────────────────────────────────────────
// 用 launchWebAuthFlow 代替 getAuthToken，开发版和发布版都能用

export async function signIn() {
  try {
    // 1. 构造 Google OAuth URL
    const redirectUrl = chrome.identity.getRedirectURL();
    const rawNonce = crypto.randomUUID();
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawNonce));
    const hashedNonce = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", redirectUrl);
    authUrl.searchParams.set("response_type", "id_token");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("nonce", hashedNonce);
    authUrl.searchParams.set("prompt", "consent");

    // 3. 从 redirect URL 提取 id_token
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true,
    });

    const hash = new URL(responseUrl).hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get("id_token");
    if (!idToken) throw new Error("No id_token in response");

    // 4. 用 Google id_token 换 Supabase session（传 nonce 保持一致）
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=id_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        provider: "google",
        id_token: idToken,
        nonce: rawNonce,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase auth failed: ${res.status} ${err}`);
    }

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
  await clearSession();
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
