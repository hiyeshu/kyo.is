/**
 * [INPUT]: chrome.* APIs, lib/storage.js, lib/auth.js, lib/sync.js, lib/config.js
 * [OUTPUT]: Service Worker 入口，注册事件监听器
 * [POS]: extension 的核心控制器，图标点击收藏（只收藏不取消）、右键菜单、快捷键、图标状态、定时同步
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import * as storage from "./lib/storage.js";
import * as auth from "./lib/auth.js";
import * as sync from "./lib/sync.js";
import { API_BASE } from "./lib/config.js";

// ─── 常量 ─────────────────────────────────────────────────────────────────────

const BADGE_ALARM_PREFIX = "kyo-badge-reset:";

// ─── 安装时初始化 ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "kyo-save-page",
    title: chrome.i18n.getMessage("contextMenuSavePage"),
    contexts: ["page"],
  });
  chrome.contextMenus.create({
    id: "kyo-save-link",
    title: chrome.i18n.getMessage("contextMenuSaveLink"),
    contexts: ["link"],
  });
  chrome.contextMenus.create({
    id: "kyo-save-selection",
    title: chrome.i18n.getMessage("contextMenuSaveSelection"),
    contexts: ["selection"],
  });
  chrome.alarms.create("kyo-sync", { periodInMinutes: 5 });
});

// ─── 核心动作：只收藏，不取消（取消在 kyo.is 桌面操作）──────────────────────

/**
 * 保存当前标签页为书签，已收藏则静默忽略
 * @param {chrome.tabs.Tab} tab
 */
async function handleSaveAction(tab) {
  if (!tab?.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) return;
  const existing = await storage.getByUrl(tab.url);
  if (existing) return;
  await flashBadge(tab.id, "✓", "#00C853");
  const bookmark = await saveBookmark(tab.url, tab.title);
  if (bookmark) notifyNewtab(bookmark);
}

chrome.action.onClicked.addListener(handleSaveAction);

// ─── 右键菜单处理 ─────────────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let bookmark;
  if (info.menuItemId === "kyo-save-page") {
    bookmark = await saveBookmark(tab.url, tab.title);
  } else if (info.menuItemId === "kyo-save-link") {
    bookmark = await saveBookmark(info.linkUrl, info.linkUrl);
  } else if (info.menuItemId === "kyo-save-selection") {
    bookmark = await saveBookmark(tab.url, tab.title, info.selectionText);
  }
  if (bookmark) notifyNewtab(bookmark);
});

// ─── 快捷键 Alt+K ─────────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "save-bookmark") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) await handleSaveAction(tab);
});

// ─── Tab 切换时更新图标状态 ───────────────────────────────────────────────────

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (tab?.url) await updateIcon(tab.url);
});

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    if (tab?.url) await updateIcon(tab.url);
  }
});

// ─── 定时同步 + Badge 重置（统一 alarm 处理）─────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "kyo-sync") {
    await sync.syncUnsynced();
    return;
  }
  // badge 重置 alarm: "kyo-badge-reset:{tabId}"
  if (alarm.name.startsWith(BADGE_ALARM_PREFIX)) {
    const tabId = Number(alarm.name.slice(BADGE_ALARM_PREFIX.length));
    if (!tabId) return;
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (tab?.url) await updateIcon(tab.url);
  }
});

// ─── 消息处理（来自 newtab iframe 桥接）───────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "auth-session") {
    handleAuthSession(msg.session).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.action === "get-bookmarks") {
    storage.getAll().then((items) => sendResponse({ items }));
    return true;
  }
  if (msg.action === "get-browser-data") {
    getBrowserData().then((data) => sendResponse(data));
    return true;
  }
});

/**
 * @param {Object|null} session
 */
async function handleAuthSession(session) {
  if (session) {
    await auth.saveSession(session);
    await sync.initialSync();
  } else {
    await auth.clearSession();
  }
}

// ─── 浏览器原生数据采集 ──────────────────────────────────────────────────────

/**
 * 采集 Chrome 原生书签（扁平化）+ 最近历史记录
 * @returns {Promise<{bookmarks: Array, history: Array}>}
 */
async function getBrowserData() {
  const [bookmarkTree, historyItems] = await Promise.all([
    chrome.bookmarks.getTree().catch(() => []),
    chrome.history.search({ text: "", maxResults: 200, startTime: 0 }).catch(() => []),
  ]);

  // 书签树扁平化，保留文件夹路径
  const bookmarks = [];
  function flatten(nodes, folder) {
    for (const node of nodes) {
      if (node.url) {
        bookmarks.push({
          id: node.id,
          title: node.title || node.url,
          url: node.url,
          dateAdded: node.dateAdded,
          folder,
        });
      }
      if (node.children) {
        flatten(node.children, node.title || folder);
      }
    }
  }
  flatten(bookmarkTree, "");

  const history = historyItems.map((h) => ({
    id: h.id,
    title: h.title || h.url,
    url: h.url,
    lastVisitTime: h.lastVisitTime,
    visitCount: h.visitCount || 0,
  }));

  return { bookmarks, history };
}

// ─── 核心：保存书签 ──────────────────────────────────────────────────────────
// 流程：存本地 → 立即推云端 → 异步 enrich 后再补推一次

/**
 * @param {string} url
 * @param {string} title
 * @param {string} [note]
 * @returns {Promise<Object|null>}
 */
async function saveBookmark(url, title, note) {
  if (!url || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) return null;

  const bookmark = await storage.add({
    title: title || url,
    url,
    summary: note || "",
  });

  await updateIcon(url);
  await sync.pushBookmark(bookmark);

  // 异步增强元数据，完成后补推更新
  enrichBookmark(bookmark).then(async (updated) => {
    if (updated) {
      sync.pushBookmark(updated);
      notifyNewtab(updated);
    }
  });

  return bookmark;
}

// ─── 元数据增强（通过 storage.update 安全写入）────────────────────────────────

/**
 * 调用 /api/scrape 获取元数据，通过 storage.update() 写入
 * @param {Object} bookmark
 * @returns {Promise<Object|null>} 更新后的书签，失败返回 null
 */
async function enrichBookmark(bookmark) {
  try {
    const res = await fetch(`${API_BASE}/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: bookmark.url }),
    });
    if (!res.ok) return null;
    const meta = await res.json();

    const fields = {};
    if (meta.title) fields.title = meta.title;
    if (meta.summary) fields.summary = meta.summary;
    if (meta.tags?.length) fields.tags = meta.tags;
    if (meta.faviconUrl) fields.favicon = meta.faviconUrl;

    if (Object.keys(fields).length === 0) return null;
    return await storage.update(bookmark.id, fields);
  } catch (err) {
    console.error("[kyo:bg] enrich failed:", err);
    return null;
  }
}

// ─── 图标状态 ─────────────────────────────────────────────────────────────────

/**
 * @param {string} url
 */
async function updateIcon(url) {
  const saved = await storage.has(url);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.action.setBadgeText({ tabId: tab.id, text: saved ? "✓" : "" });
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#333" });
  }
}

// ─── Badge 闪烁反馈（用 chrome.alarms 替代 setTimeout，SW 安全）──────────────

/**
 * @param {number} tabId
 * @param {string} text
 * @param {string} color
 */
async function flashBadge(tabId, text, color) {
  if (!tabId) return;
  await chrome.action.setBadgeText({ tabId, text });
  await chrome.action.setBadgeBackgroundColor({ tabId, color });
  // 用 alarm 替代 setTimeout，Service Worker 可能在 1.5s 内被杀
  await chrome.alarms.create(`${BADGE_ALARM_PREFIX}${tabId}`, { delayInMinutes: 1.5 / 60 });
}

// ─── 通知 newtab 页面（书签桥接到 kyo.is iframe）─────────────────────────────

/**
 * @param {Object} bookmark
 */
function notifyNewtab(bookmark) {
  chrome.runtime.sendMessage({ action: "bookmark-added", bookmark }).catch(() => {});
}
