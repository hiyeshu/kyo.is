/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: SUPABASE_URL, SUPABASE_ANON_KEY, API_BASE, STORAGE_KEYS
 * [POS]: extension/lib 的配置单一真相源，所有模块从此处导入常量
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ─── Supabase ────────────────────────────────────────────────────────────────

/** @type {string} Supabase 项目 URL */
export const SUPABASE_URL = "https://icrcrtriimlfyqwuonnz.supabase.co";

/** @type {string} Supabase 匿名公钥（可公开） */
export const SUPABASE_ANON_KEY = "sb_publishable_3dc-PxcnVxabpjwHPED9Rg_PT-2aNXg";

// ─── API ─────────────────────────────────────────────────────────────────────

/** @type {string} kyo.is API 基础路径 */
export const API_BASE = "https://kyo.is/api";

// ─── Storage Keys ────────────────────────────────────────────────────────────

/** @type {{ BOOKMARKS: string, AUTH_SESSION: string }} chrome.storage.local 键名 */
export const STORAGE_KEYS = {
  BOOKMARKS: "kyo:bookmarks",
  AUTH_SESSION: "kyo:auth-session",
};
