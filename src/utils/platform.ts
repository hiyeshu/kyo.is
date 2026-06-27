/**
 * [INPUT]: 依赖浏览器 window/navigator，使用 URL 与环境变量进行判断
 * [OUTPUT]: 导出 isTauri/isWeb/getApiBaseUrl/getApiUrl/extractFirstUrl/isTauriWindows
 * [POS]: utils 的平台与环境判断入口，被前端与 API 调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/**
 * Check if the app is running in Tauri (desktop app)
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/**
 * Check if the app is running in a web browser
 */
export function isWeb(): boolean {
  return !isTauri();
}

/**
 * Get the API base URL.
 * In Tauri (desktop app), returns the production API URL.
 * In web browser, returns empty string for relative paths.
 */
export function getApiBaseUrl(): string {
  if (isTauri()) {
    return "https://kyo.is";
  }
  return "";
}

/**
 * Get the full API URL for a given path.
 * Automatically handles Tauri vs web differences.
 * @param path - API path (e.g., "/api/agent/chat")
 * @returns Full URL (e.g., "https://kyo.is/api/agent/chat" in Tauri, "/api/agent/chat" in web)
 */
export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * Extract the first URL from a text string.
 * Returns null if no URL is found.
 */
export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

/**
 * Check if Tauri is running on Windows (Chromium) or Mac (WebKit)
 * @returns true if Windows (Chromium), false if Mac (WebKit) or not Tauri
 */
export function isTauriWindows(): boolean {
  if (!isTauri()) {
    return false;
  }
  
  if (typeof window === "undefined") {
    return false;
  }
  
  // Chromium detection: check for window.chrome object
  // On Windows, Tauri uses Chromium which has window.chrome
  // On Mac, Tauri uses WebKit which doesn't have window.chrome
  const hasChrome = "chrome" in window && (window as { chrome?: unknown }).chrome !== undefined;
  
  // If Chromium (has window.chrome), it's Windows
  // If WebKit (no window.chrome), it's Mac
  return hasChrome;
}
