/**
 * [INPUT]: chrome.* APIs, lib/storage.js, lib/auth.js, lib/sync.js
 * [OUTPUT]: Service Worker 入口，注册事件监听器
 * [POS]: extension 的核心控制器，管理收藏、右键菜单、快捷键、图标状态、定时同步
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import * as storage from "./lib/storage.js";
import * as auth from "./lib/auth.js";
import * as sync from "./lib/sync.js";

const API_BASE = "https://kyo.is/api";

// ─── 安装时初始化 ────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // 右键菜单：页面
  chrome.contextMenus.create({
    id: "kyo-save-page",
    title: "Save to Kyo",
    contexts: ["page"],
  });

  // 右键菜单：链接
  chrome.contextMenus.create({
    id: "kyo-save-link",
    title: "Save link to Kyo",
    contexts: ["link"],
  });

  // 右键菜单：选中文字
  chrome.contextMenus.create({
    id: "kyo-save-selection",
    title: "Save to Kyo with note",
    contexts: ["selection"],
  });

  // 定时同步（每 5 分钟）
  chrome.alarms.create("kyo-sync", { periodInMinutes: 5 });
});

// ─── 右键菜单处理 ────────────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "kyo-save-page") {
    await saveBookmark(tab.url, tab.title);
  } else if (info.menuItemId === "kyo-save-link") {
    await saveBookmark(info.linkUrl, info.linkUrl);
  } else if (info.menuItemId === "kyo-save-selection") {
    await saveBookmark(tab.url, tab.title, info.selectionText);
  }
});

// ─── 快捷键 Alt+K ────────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "save-bookmark") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) await saveBookmark(tab.url, tab.title);
  }
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

// ─── 核心：保存书签 ─────────────────────────────────────────────────────────

async function saveBookmark(url, title, note) {
  if (!url || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) return;

  // 1. 先存本地（即时反馈）
  const bookmark = await storage.add({
    title: title || url,
    url,
    summary: note || "",
  });

  // 2. 更新图标为已收藏
  await updateIcon(url);

  // 3. 异步获取元数据（AI 摘要 + 标签）
  enrichBookmark(bookmark);

  // 4. 如果已登录，推送到云端
  sync.pushBookmark(bookmark);
}

// ─── 异步元数据增强 ─────────────────────────────────────────────────────────

async function enrichBookmark(bookmark) {
  try {
    const res = await fetch(`${API_BASE}/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: bookmark.url }),
    });

    if (!res.ok) return;
    const meta = await res.json();

    // 更新本地书签
    const all = await storage.getAll();
    const item = all.find((b) => b.id === bookmark.id);
    if (item) {
      if (meta.title) item.title = meta.title;
      if (meta.summary) item.summary = meta.summary;
      if (meta.tags?.length) item.tags = meta.tags;
      if (meta.faviconUrl) item.favicon = meta.faviconUrl;
      await chrome.storage.local.set({ "kyo:bookmarks": all });

      // 如果已登录，重新推送更新后的数据
      sync.pushBookmark(item);
    }
  } catch (err) {
    console.error("[kyo:bg] enrich failed:", err);
  }
}

// ─── 图标状态：已收藏 / 未收藏 ──────────────────────────────────────────────

async function updateIcon(url) {
  const saved = await storage.has(url);
  // TODO: 用不同图标区分已收藏/未收藏
  // 暂时用 badge 文字标记
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.action.setBadgeText({
      tabId: tab.id,
      text: saved ? "✓" : "",
    });
    await chrome.action.setBadgeBackgroundColor({
      tabId: tab.id,
      color: saved ? "#333" : "#999",
    });
  }
}
