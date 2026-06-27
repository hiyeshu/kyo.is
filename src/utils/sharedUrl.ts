/**
 * [INPUT]: 依赖浏览器 window.location
 * [OUTPUT]: generateAppShareUrl / generateAppletShareUrl，生成应用和 applet 分享 URL
 * [POS]: utils/ 的分享 URL 生成器，被 AppMenu 与分享弹窗消费，不持有后端状态
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/**
 * Generates a shareable URL for a specific app.
 * @param appId The ID of the app (e.g., 'internet-explorer', 'soundboard').
 * @returns The full shareable URL (e.g., 'https://hostname.com/internet-explorer').
 */
export function generateAppShareUrl(appId: string): string {
  if (typeof window === 'undefined') {
    // Handle server-side rendering or environments without window
    console.warn('Cannot generate app share URL: window object is not available.');
    return ''; // Or throw an error, depending on desired behavior
  }
  return `${window.location.origin}/${appId}`;
}

/**
 * Generates a shareable URL for an applet using its share ID.
 * @param id The share ID of the applet.
 * @returns The full shareable URL (e.g., 'https://hostname.com/applet-viewer/{id}').
 */
export function generateAppletShareUrl(id: string): string {
  if (typeof window === 'undefined') {
    console.warn('Cannot generate applet share URL: window object is not available.');
    return '';
  }
  return `${window.location.origin}/applet-viewer/${id}`;
}
