/**
 * [INPUT]: chrome.tabs API, lib/storage.js, lib/auth.js, lib/sync.js
 * [OUTPUT]: Popup UI 渲染逻辑
 * [POS]: extension 的弹窗交互层，显示收藏状态 + 登录入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import * as storage from "./lib/storage.js";
import * as auth from "./lib/auth.js";
import * as sync from "./lib/sync.js";

const $status = document.getElementById("status");
const $actions = document.getElementById("actions");
const $footer = document.getElementById("footer");

// ─── 初始化 ──────────────────────────────────────────────────────────────────

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || "";
  const title = tab?.title || "";
  const loggedIn = await auth.isLoggedIn();
  const session = await auth.getSession();
  const saved = url ? await storage.has(url) : false;

  renderStatus(saved, url);
  renderActions(saved, url, title);
  renderFooter(loggedIn, session);
}

// ─── 状态区 ──────────────────────────────────────────────────────────────────

function renderStatus(saved, url) {
  if (!url || url.startsWith("chrome://")) {
    $status.innerHTML = `
      <div class="status-icon unsaved">—</div>
      <div class="status-desc">Can't save this page</div>
    `;
    return;
  }

  if (saved) {
    $status.innerHTML = `
      <div class="status-icon saved">✓</div>
      <div class="status-title">Saved</div>
      <div class="status-desc">${new URL(url).hostname}</div>
    `;
  } else {
    $status.innerHTML = `
      <div class="status-icon unsaved">+</div>
      <div class="status-title">Not saved</div>
      <div class="status-desc">${new URL(url).hostname}</div>
    `;
  }
}

// ─── 操作按钮 ────────────────────────────────────────────────────────────────

function renderActions(saved, url, title) {
  if (!url || url.startsWith("chrome://")) {
    $actions.innerHTML = "";
    return;
  }

  if (saved) {
    $actions.innerHTML = `
      <button class="btn btn-secondary" id="btn-remove">Remove</button>
    `;
    document.getElementById("btn-remove").addEventListener("click", async () => {
      const bookmark = await storage.getByUrl(url);
      if (bookmark) await storage.remove(bookmark.id);
      window.close();
    });
  } else {
    $actions.innerHTML = `
      <button class="btn btn-primary" id="btn-save">Save to Kyo</button>
    `;
    document.getElementById("btn-save").addEventListener("click", async () => {
      // 通过 background.js 保存（触发元数据增强 + 同步）
      await chrome.runtime.sendMessage({
        type: "save-bookmark",
        url,
        title,
      });
      window.close();
    });
  }
}

// ─── 底部：登录状态 ──────────────────────────────────────────────────────────

function renderFooter(loggedIn, session) {
  if (loggedIn && session?.user) {
    const avatar = session.user.user_metadata?.avatar_url || "";
    const name = session.user.user_metadata?.full_name || session.user.email || "";
    $footer.innerHTML = `
      <div class="footer-user">
        ${avatar ? `<img src="${avatar}" alt="">` : ""}
        <span>${name}</span>
      </div>
      <span class="footer-sync">Synced</span>
    `;
  } else {
    $footer.innerHTML = `
      <button class="footer-login" id="btn-login">Sign in to sync</button>
    `;
    document.getElementById("btn-login").addEventListener("click", async () => {
      const session = await auth.signIn();
      if (session) {
        // 登录成功 → 触发无感迁移
        await sync.initialSync();
        init(); // 刷新 UI
      }
    });
  }
}

// ─── 监听 background.js 消息 ────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "save-bookmark") {
    // background.js 处理实际保存
    return;
  }
});

init();
