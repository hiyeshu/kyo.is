/**
 * [INPUT]: 依赖 Vercel Edge Runtime
 * [OUTPUT]: 对外提供 OG meta tags 处理，应用路由重写
 * [POS]: 根目录的 Edge Middleware，处理 SEO 和社交分享预览
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// App display names for OG titles
const APP_NAMES: Record<string, string> = {
  bookmarks: "Bookmarks",
  "theme-editor": "Theme Editor",
};

// App descriptions
const APP_DESCRIPTIONS: Record<string, string> = {
  bookmarks: "Manage your favorite links and bookmarks",
  "theme-editor": "Customize your Kyo theme and appearance",
};

// App ID to icon mapping
const APP_ICONS: Record<string, string> = {
  bookmarks: "bookmarks.png",
  "theme-editor": "control-panels/appearance-manager/app.png",
};

function generateOgHtml(options: {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  redirectUrl: string;
  type?: string;
}): string {
  const { title, description, imageUrl, url, redirectUrl, type = "website" } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="${type}">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:site_name" content="Kyo">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <script>location.replace("${escapeHtml(redirectUrl)}")</script>
</head>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const config = {
  matcher: [
    "/bookmarks",
    "/theme-editor",
  ],
};

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const baseUrl = url.origin;

  // Skip if already redirected (has _kyo param)
  if (url.searchParams.has("_kyo")) {
    return;
  }

  // Default values
  let imageUrl = `${baseUrl}/apple-touch-icon.png?v=2`;
  let title = "Kyo";
  let description = "Personal web portal and bookmark launcher";
  let matched = false;

  // App URLs: /bookmarks, /theme-editor
  const appMatch = pathname.match(/^\/([a-z-]+)$/);
  if (appMatch && APP_NAMES[appMatch[1]]) {
    const appId = appMatch[1];
    imageUrl = `${baseUrl}/icons/macosx/${APP_ICONS[appId]}`;
    title = `${APP_NAMES[appId]} on Kyo`;
    description = APP_DESCRIPTIONS[appId] || "Open app in Kyo";
    matched = true;
  }

  // If we have matched a share URL, return OG HTML
  if (matched) {
    const pageUrl = `${baseUrl}${pathname}`;
    // Redirect URL includes _kyo param to bypass middleware on next request
    const redirectUrl = `${pageUrl}?_kyo=1`;

    const html = generateOgHtml({
      title,
      description,
      imageUrl,
      url: pageUrl,
      redirectUrl,
    });

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // no-store prevents service worker from caching this redirect page
        // s-maxage allows CDN to cache for crawlers (they don't have SW)
        "Cache-Control": "no-store, s-maxage=3600",
      },
    });
  }

  // For all other paths, continue normally
  return;
}
