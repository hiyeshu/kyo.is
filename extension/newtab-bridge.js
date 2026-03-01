/**
 * [INPUT]: kyo.is iframe postMessage, chrome.runtime 消息, chrome.i18n
 * [OUTPUT]: 将 auth session、书签数据、浏览器原生数据中继到 kyo.is iframe / background service worker
 * [POS]: extension 的桥接脚本，newtab.html 加载，双向连接 kyo.is 与 background.js
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const iframe = document.getElementById("kyo");
const overlay = document.getElementById("kyo-error");
const KYO_URL = "https://kyo.is";

// ─── iframe 加载失败处理 ──────────────────────────────────────────────────────

let loaded = false;
let timeoutId = null;
let retryCount = 0;

function clearLoadTimeout() {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
}

function scheduleLoadTimeout() {
  clearLoadTimeout();
  timeoutId = setTimeout(() => {
    // 10s 内未完成加载，先自动重试一次，避免误判导致白屏遮罩
    if (!loaded && retryCount < 1) {
      retryCount += 1;
      loadKyo(true);
      return;
    }
    if (!loaded) showError();
  }, 10000);
}

function loadKyo(forceFresh = false) {
  loaded = false;
  if (overlay) overlay.hidden = true;
  const url = forceFresh ? `${KYO_URL}?_ts=${Date.now()}` : KYO_URL;
  iframe.src = url;
  scheduleLoadTimeout();
}

iframe.addEventListener("load", () => {
  loaded = true;
  clearLoadTimeout();
  retryCount = 0;
  if (overlay) overlay.hidden = true;
  iframe.contentWindow.postMessage({ type: "kyo:handshake" }, KYO_URL);

  // 握手后立即拉取插件本地书签，推给 kyo.is iframe
  chrome.runtime.sendMessage({ action: "get-bookmarks" }, (res) => {
    if (res?.items?.length) {
      iframe.contentWindow.postMessage(
        { type: "kyo:bookmark-sync", bookmarks: res.items },
        KYO_URL
      );
    }
  });

  // 新标签页自动打开全局搜索
  iframe.contentWindow.postMessage({ type: "kyo:open-search" }, KYO_URL);

  // 拉取浏览器原生书签 + 历史记录，推给 kyo.is
  chrome.runtime.sendMessage({ action: "get-browser-data" }, (res) => {
    if (res?.bookmarks || res?.history) {
      iframe.contentWindow.postMessage(
        { type: "kyo:browser-data", bookmarks: res.bookmarks || [], history: res.history || [] },
        KYO_URL
      );
    }
  });
});

iframe.addEventListener("error", showError);

/**
 * 显示错误遮罩，点击重试
 */
function showError() {
  if (!overlay) return;
  overlay.hidden = false;
  overlay.textContent = chrome.i18n.getMessage("newtabLoadError");
}

if (overlay) {
  overlay.addEventListener("click", () => {
    overlay.hidden = true;
    retryCount = 0;
    loadKyo(true);
  });
}

// ─── Auth 桥接：kyo.is iframe → background service worker ────────────────────

window.addEventListener("message", (e) => {
  if (e.origin !== KYO_URL) return;
  if (e.data?.type !== "kyo:auth") return;
  chrome.runtime.sendMessage({ action: "auth-session", session: e.data.session });
});

// ─── 书签桥接：background → newtab → kyo.is iframe（实时推送）────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action !== "bookmark-added" || !msg.bookmark) return;
  iframe.contentWindow.postMessage(
    { type: "kyo:bookmark-add", bookmark: msg.bookmark },
    KYO_URL
  );
});

// 关键：监听器挂载完成后再设置 iframe src，避免首屏 load 事件竞争丢失
loadKyo();
