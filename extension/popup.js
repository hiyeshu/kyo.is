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

  let loggedIn = false;
  let session = null;
  try {
    loggedIn = await auth.isLoggedIn();
    session = await auth.getSession();
  } catch {}

  const saved = url ? await storage.has(url) : false;

  renderStatus(saved, url);
  renderActions(saved, url, title);
  renderFooter(loggedIn, session);
}

// ─── 状态区 ──────────────────────────────────────────────────────────────────

function renderStatus(saved, url) {
  if (!url || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) {
    $status.innerHTML = `
      <div class="status-icon unsaved">—</div>
      <div class="status-desc">无法收藏此页面</div>
    `;
    return;
  }

  let hostname = url;
  try { hostname = new URL(url).hostname; } catch {}

  if (saved) {
    $status.innerHTML = `
      <div class="status-icon saved">✓</div>
      <div class="status-title">已收藏</div>
      <div class="status-desc">${hostname}</div>
    `;
  } else {
    $status.innerHTML = `
      <div class="status-icon unsaved">+</div>
      <div class="status-title">未收藏</div>
      <div class="status-desc">${hostname}</div>
    `;
  }
}

// ─── 操作按钮 ────────────────────────────────────────────────────────────────

function renderActions(saved, url, title) {
  if (!url || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) {
    $actions.innerHTML = "";
    return;
  }

  if (saved) {
    $actions.innerHTML = `<button class="aqua-btn secondary" id="btn-remove"><span>移除收藏</span></button>`;
    document.getElementById("btn-remove").addEventListener("click", async () => {
      const bookmark = await storage.getByUrl(url);
      if (bookmark) await storage.remove(bookmark.id);
      window.close();
    });
  } else {
    $actions.innerHTML = `<button class="aqua-btn primary" id="btn-save"><span>收藏到 Kyo</span></button>`;
    document.getElementById("btn-save").addEventListener("click", async () => {
      // 通知 background 执行完整保存流程（本地 + 元数据 + 云端同步）
      chrome.runtime.sendMessage({ action: "save-bookmark", url, title });
      renderStatus(true, url);
      renderActions(true, url, title);
      setTimeout(() => window.close(), 600);
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
      <span class="footer-sync">已同步</span>
    `;
  } else {
    $footer.innerHTML = `<button class="footer-login" id="btn-login">登录 Google 同步收藏</button>`;
    document.getElementById("btn-login").addEventListener("click", async () => {
      const btn = document.getElementById("btn-login");
      btn.textContent = "登录中...";
      btn.style.pointerEvents = "none";
      try {
        const session = await auth.signIn();
        if (session) {
          await sync.initialSync();
          init();
        } else {
          btn.textContent = "登录失败，点击重试";
          btn.style.pointerEvents = "";
        }
      } catch (err) {
        console.error("[kyo:popup] login error:", err);
        btn.textContent = "登录失败，点击重试";
        btn.style.pointerEvents = "";
      }
    });
  }
}

init();
