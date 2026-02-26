/**
 * [INPUT]: chrome.* APIs, lib/storage.js, lib/auth.js, lib/sync.js
 * [OUTPUT]: Service Worker 入口，注册事件监听器
 * [POS]: extension 的核心控制器，图标点击收藏（只收藏不取消）、右键菜单、快捷键、图标状态、定时同步
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import * as storage from "./lib/storage.js";
import * as auth from "./lib/auth.js";
import * as sync from "./lib/sync.js";

const API_BASE = "https://kyo.is/api";

// ─── 安装时初始化 ────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "kyo-save-page", title: "收藏到 Kyo", contexts: ["page"] });
  chrome.contextMenus.create({ id: "kyo-save-link", title: "收藏链接到 Kyo", contexts: ["link"] });
  chrome.contextMenus.create({ id: "kyo-save-selection", title: "收藏到 Kyo（含备注）", contexts: ["selection"] });
  chrome.alarms.create("kyo-sync", { periodInMinutes: 5 });
});

// ─── 核心动作：只收藏，不取消（取消在 kyo.is 桌面操作）─────────────────────

async function handleSaveAction(tab) {
  if (!tab?.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) return;
  const existing = await storage.getByUrl(tab.url);
  if (existing) return; // 已收藏 → 静默忽略
  await flashBadge(tab.id, "✓", "#00C853");
  const bookmark = await saveBookmark(tab.url, tab.title);
  if (bookmark) notifyNewtab(bookmark);
}

chrome.action.onClicked.addListener(handleSaveAction);

// ─── 右键菜单处理 ────────────────────────────────────────────────────────────

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

// ─── 快捷键 Alt+K ────────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "save-bookmark") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) await handleSaveAction(tab);
});

// ─── Tab 切换时更新图标状态 ──────────────────────────────────────────────────

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab?.url) await updateIcon(tab.url);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    if (tab?.url) await updateIcon(tab.url);
  }
});

// ─── 定时同步 ────────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "kyo-sync") {
    await sync.syncUnsynced();
  }
});

// ─── 消息处理（来自 newtab iframe 桥接）──────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "auth-session") {
    handleAuthSession(msg.session).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.action === "get-bookmarks") {
    storage.getAll().then((items) => sendResponse({ items }));
    return true;
  }
});

async function handleAuthSession(session) {
  if (session) {
    await auth.saveSession(session);
    await sync.initialSync();
  } else {
    await auth.clearSession();
  }
}

// ─── 核心：保存书签 ─────────────────────────────────────────────────────────
// 流程：存本地 → 立即推云端 → 异步 enrich 后再补推一次

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
  enrichBookmark(bookmark).then(async () => {
    const latest = await storage.getByUrl(url);
    if (latest) {
      sync.pushBookmark(latest);
      notifyNewtab(latest);
    }
  });

  return bookmark;
}

// ─── 元数据增强（纯本地操作）────────────────────────────────────────────────

async function enrichBookmark(bookmark) {
  try {
    const res = await fetch(`${API_BASE}/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: bookmark.url }),
    });
    if (!res.ok) return;
    const meta = await res.json();

    const all = await storage.getAll();
    const item = all.find((b) => b.id === bookmark.id);
    if (!item) return;

    if (meta.title) item.title = meta.title;
    if (meta.summary) item.summary = meta.summary;
    if (meta.tags?.length) item.tags = meta.tags;
    if (meta.faviconUrl) item.favicon = meta.faviconUrl;
    await chrome.storage.local.set({ "kyo:bookmarks": all });
  } catch (err) {
    console.error("[kyo:bg] enrich failed:", err);
  }
}

// ─── 图标状态 ────────────────────────────────────────────────────────────────

async function updateIcon(url) {
  const saved = await storage.has(url);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.action.setBadgeText({ tabId: tab.id, text: saved ? "✓" : "" });
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#333" });
  }
}

// ─── Badge 闪烁反馈（1.5s 后消失）──────────────────────────────────────────

async function flashBadge(tabId, text, color) {
  if (!tabId) return;
  await chrome.action.setBadgeText({ tabId, text });
  await chrome.action.setBadgeBackgroundColor({ tabId, color });
  setTimeout(async () => {
    // 闪烁结束后恢复真实状态
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (tab?.url) await updateIcon(tab.url);
  }, 1500);
}

// ─── 通知 newtab 页面（书签桥接到 kyo.is iframe）────────────────────────────

function notifyNewtab(bookmark) {
  chrome.runtime.sendMessage({ action: "bookmark-added", bookmark }).catch(() => {});
}
