/**
 * [INPUT]: kyo.is iframe postMessage, chrome.runtime 消息
 * [OUTPUT]: 将 auth session 和书签数据中继到 kyo.is iframe / background service worker
 * [POS]: extension 的桥接脚本，newtab.html 加载，双向连接 kyo.is 与 background.js
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const iframe = document.getElementById("kyo");

// ─── Auth 桥接：kyo.is iframe → background service worker ───────────────────

iframe.addEventListener("load", () => {
  iframe.contentWindow.postMessage({ type: "kyo:handshake" }, "https://kyo.is");

  // 握手后立即拉取插件本地书签，推给 kyo.is iframe
  chrome.runtime.sendMessage({ action: "get-bookmarks" }, (res) => {
    if (res?.items?.length) {
      iframe.contentWindow.postMessage(
        { type: "kyo:bookmark-sync", bookmarks: res.items },
        "https://kyo.is"
      );
    }
  });
});

window.addEventListener("message", (e) => {
  if (e.origin !== "https://kyo.is") return;
  if (e.data?.type !== "kyo:auth") return;
  chrome.runtime.sendMessage({ action: "auth-session", session: e.data.session });
});

// ─── 书签桥接：background → newtab → kyo.is iframe（实时推送）───────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action !== "bookmark-added" || !msg.bookmark) return;
  iframe.contentWindow.postMessage(
    { type: "kyo:bookmark-add", bookmark: msg.bookmark },
    "https://kyo.is"
  );
});
