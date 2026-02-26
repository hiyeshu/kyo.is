/**
 * [INPUT]: kyo.is iframe postMessage, chrome.runtime.sendMessage
 * [OUTPUT]: 将 kyo.is 的 auth session 中继到 background service worker
 * [POS]: extension 的认证桥接脚本，newtab.html 加载，连接 kyo.is 与 background.js
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ─── Auth 桥接：kyo.is iframe → background service worker ───────────────────

const iframe = document.getElementById("kyo");

// iframe 加载完成后发送握手消息
iframe.addEventListener("load", () => {
  iframe.contentWindow.postMessage({ type: "kyo:handshake" }, "https://kyo.is");
});

// 监听 kyo.is 回传的 session
window.addEventListener("message", (e) => {
  if (e.origin !== "https://kyo.is") return;
  if (e.data?.type !== "kyo:auth") return;
  chrome.runtime.sendMessage({ action: "auth-session", session: e.data.session });
});
