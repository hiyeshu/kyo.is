/**
 * [INPUT]: chrome.storage.local API, lib/config.js
 * [OUTPUT]: getAll, add, remove, has, getByUrl, update, markSynced, getUnsynced, mergeFromCloud
 * [POS]: extension/lib 的书签本地存储层，被 background.js 和 sync.js 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { STORAGE_KEYS } from "./config.js";

const KEY = STORAGE_KEYS.BOOKMARKS;

// ─── 内部读写 ─────────────────────────────────────────────────────────────────

/**
 * @returns {Promise<Array<Object>>} 所有书签
 */
export async function getAll() {
  const result = await chrome.storage.local.get(KEY);
  return result[KEY] || [];
}

/**
 * @param {Array<Object>} bookmarks
 */
async function _saveAll(bookmarks) {
  await chrome.storage.local.set({ [KEY]: bookmarks });
}

// ─── 添加书签 ─────────────────────────────────────────────────────────────────

/**
 * 添加书签，重复 URL 静默更新时间戳
 * @param {{ title?: string, url: string, summary?: string, tags?: string[], favicon?: string }} bookmark
 * @returns {Promise<Object>} 新增或已存在的书签
 */
export async function add(bookmark) {
  const all = await getAll();
  const existing = all.find((b) => b.url === bookmark.url);
  if (existing) {
    existing.lastUsed = new Date().toISOString();
    await _saveAll(all);
    return existing;
  }
  const item = {
    id: crypto.randomUUID(),
    title: bookmark.title || "",
    url: bookmark.url,
    summary: bookmark.summary || "",
    tags: bookmark.tags || [],
    favicon: bookmark.favicon || "",
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
    onDesktop: true,
    inDock: false,
    _synced: false,
  };
  all.push(item);
  await _saveAll(all);
  return item;
}

// ─── 更新书签字段（按 id 局部合并）──────────────────────────────────────────

/**
 * 按 id 局部更新书签字段，不存在则静默忽略
 * @param {string} id
 * @param {Partial<Object>} fields - 要合并的字段
 * @returns {Promise<Object|null>} 更新后的书签，不存在返回 null
 */
export async function update(id, fields) {
  const all = await getAll();
  const item = all.find((b) => b.id === id);
  if (!item) return null;
  Object.assign(item, fields);
  await _saveAll(all);
  return item;
}

// ─── 删除书签 ─────────────────────────────────────────────────────────────────

/**
 * @param {string} id
 */
export async function remove(id) {
  const all = await getAll();
  const filtered = all.filter((b) => b.id !== id);
  await _saveAll(filtered);
}

// ─── 查询 ─────────────────────────────────────────────────────────────────────

/**
 * @param {string} url
 * @returns {Promise<boolean>}
 */
export async function has(url) {
  const all = await getAll();
  return all.some((b) => b.url === url);
}

/**
 * @param {string} url
 * @returns {Promise<Object|null>}
 */
export async function getByUrl(url) {
  const all = await getAll();
  return all.find((b) => b.url === url) || null;
}

// ─── 同步标记 ─────────────────────────────────────────────────────────────────

/**
 * @param {string} id
 */
export async function markSynced(id) {
  await update(id, { _synced: true });
}

/**
 * @returns {Promise<Array<Object>>} 未同步的书签
 */
export async function getUnsynced() {
  const all = await getAll();
  return all.filter((b) => !b._synced);
}

// ─── 批量合并（云端数据合入本地）──────────────────────────────────────────────

/**
 * @param {Array<Object>} cloudBookmarks
 * @returns {Promise<number>} 新增条数
 */
export async function mergeFromCloud(cloudBookmarks) {
  const local = await getAll();
  const localUrls = new Set(local.map((b) => b.url));
  let added = 0;
  for (const cb of cloudBookmarks) {
    if (!localUrls.has(cb.url)) {
      local.push({ ...cb, _synced: true });
      added++;
    }
  }
  if (added > 0) await _saveAll(local);
  return added;
}
