/**
 * [INPUT]: 依赖 React 19 的 createRoot，依赖 App 根组件，依赖 lib/i18n 的国际化初始化，依赖 stores/useThemeStore 的主题状态，依赖 utils/prefetch 的资源预加载
 * [OUTPUT]: 对外提供应用入口，React 渲染、i18n 初始化、主题水合、Analytics 集成、资源预加载、错误处理
 * [POS]: src/ 的入口文件，被 index.html 加载，是整个前端应用的启动点
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { Analytics } from "@vercel/analytics/react";
import "./styles/design-system.css";
import "./index.css";
import { useThemeStore } from "./stores/useThemeStore";
import { initPrefetch } from "./utils/prefetch";
import "./lib/i18n";
import { primeReactResources } from "./lib/reactResources";

// Prime React 19 resource hints before anything else runs
primeReactResources();

// ============================================================================
// CHUNK LOAD ERROR HANDLING - Reload when old assets 404 after deployment
// ============================================================================
const handlePreloadError = (event: Event) => {
  console.warn("[Kyo] Chunk load failed:", event);
  
  // Don't reload if offline - it won't help and will cause a flash loop
  if (!navigator.onLine) {
    console.warn("[Kyo] Skipping reload - device is offline");
    return;
  }
  
  // Use the same loop protection as index.html's stale bundle detection
  const reloadKey = "kyo-stale-reload";
  const lastReload = sessionStorage.getItem(reloadKey);
  const now = Date.now();
  
  // If we reloaded in the last 10 seconds, don't reload again
  if (lastReload && now - parseInt(lastReload, 10) < 10000) {
    console.warn("[Kyo] Recently reloaded for stale bundle, skipping to prevent loop");
    return;
  }
  
  // Mark that we're reloading
  sessionStorage.setItem(reloadKey, String(now));
  console.log("[Kyo] Reloading for fresh assets...");
  window.location.reload();
};

window.addEventListener("vite:preloadError", handlePreloadError);

// HMR cleanup - prevent listener stacking during development
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener("vite:preloadError", handlePreloadError);
  });
}

// ============================================================================
// PREFETCHING - Cache icons, sounds, and app components after boot
// This runs during idle time to populate the service worker cache
// ============================================================================
initPrefetch();

// Hydrate theme from localStorage before rendering
useThemeStore.getState().hydrate();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>
);
