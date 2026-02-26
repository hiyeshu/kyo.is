/**
 * [INPUT]: chrome.storage.local API
 * [OUTPUT]: getAll, add, remove, has, getByUrl, updateLastUsed
 * [POS]: extension/lib 的书签本地存储层，被 background.js 和 sync.js 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const STORAGE_KEY = "kyo:bookmarks";

// ─── 读取所有书签 ────────────────────────────────────────────────────────────

export async function getAll() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
}

async function _saveAll(bookmarks) {
  await chrome.storage.local.set({ [STORAGE_KEY]: bookmarks });
}

// ─── 添加书签 ────────────────────────────────────────────────────────────────

export async function add(bookmark) {
  const all = await getAll();
  const existing = all.find((b) => b.url === bookmark.url);
  if (existing) {
    // 重复收藏：静默更新时间戳
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
    _synced: false, // 本地标记：是否已同步到云端
  };
  all.push(item);
  await _saveAll(all);
  return item;
}

// ─── 删除书签 ────────────────────────────────────────────────────────────────

export async function remove(id) {
  const all = await getAll();
  const filtered = all.filter((b) => b.id !== id);
  await _saveAll(filtered);
}

// ─── 查询 ────────────────────────────────────────────────────────────────────

export async function has(url) {
  const all = await getAll();
  return all.some((b) => b.url === url);
}

export async function getByUrl(url) {
  const all = await getAll();
  return all.find((b) => b.url === url) || null;
}

// ─── 标记已同步 ──────────────────────────────────────────────────────────────

export async function markSynced(id) {
  const all = await getAll();
  const item = all.find((b) => b.id === id);
  if (item) {
    item._synced = true;
    await _saveAll(all);
  }
}

export async function getUnsynced() {
  const all = await getAll();
  return all.filter((b) => !b._synced);
}

// ─── 批量合并（云端数据合入本地）─────────────────────────────────────────────

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
