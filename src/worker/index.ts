/**
 * [INPUT]: 依赖 ./routes、../server/http、../server/types，依赖 Cloudflare ASSETS binding
 * [OUTPUT]: Cloudflare Worker fetch handler，承接静态资源、无扩展 HTML、SPA fallback、agent/channel/compat API
 * [POS]: worker/ 的部署入口，是 API、静态资源与 SPA fallback 的生产边界
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { optionsResponse, withCors } from "../server/http";
import type { ExecutionContextLike, KyoWorkerEnv } from "../server/types";
import {
  handleAudioTranscribe,
  handleBookmarkPreview,
  handleItemById,
  handleSave,
  handleScrape,
  handleSearch,
  handleSync,
} from "./compatRoutes";
import { handleAgentChat, handleChannelMessages, handleChannels } from "./routes";

const APP_REWRITE_PATHS = new Set([
  "/videos",
  "/ipod",
  "/karaoke",
  "/internet-explorer",
  "/applet-viewer",
  "/finder",
  "/soundboard",
  "/chats",
  "/textedit",
  "/paint",
  "/photo-booth",
  "/minesweeper",
  "/synth",
  "/pc",
  "/terminal",
  "/control-panels",
  "/infinite-mac",
]);

export default {
  async fetch(
    request: Request,
    env: KyoWorkerEnv,
    ctx: ExecutionContextLike
  ): Promise<Response> {
    if (request.method === "OPTIONS") return optionsResponse();

    const url = new URL(request.url);
    if (url.pathname === "/api/agent/chat" || url.pathname === "/api/chat") {
      return withCors(await handleAgentChat(request, env, ctx));
    }

    if (url.pathname === "/api/channels") {
      return withCors(await handleChannels(request, env));
    }

    const messageMatch = url.pathname.match(/^\/api\/channels\/([^/]+)\/messages$/);
    if (messageMatch?.[1]) {
      return withCors(await handleChannelMessages(request, env, messageMatch[1]));
    }

    if (url.pathname === "/api/scrape") {
      return withCors(await handleScrape(request, env, ctx));
    }

    if (url.pathname === "/api/bookmark-preview") {
      return withCors(await handleBookmarkPreview(request));
    }

    if (url.pathname === "/api/audio-transcribe") {
      return withCors(handleAudioTranscribe(request));
    }

    if (url.pathname === "/api/save") {
      return withCors(await handleSave(request, env));
    }

    if (url.pathname === "/api/search") {
      return withCors(await handleSearch(request, env));
    }

    if (url.pathname === "/api/sync") {
      return withCors(await handleSync(request, env));
    }

    const itemMatch = url.pathname.match(/^\/api\/items\/([^/]+)$/);
    if (itemMatch?.[1]) {
      return withCors(await handleItemById(request, env, itemMatch[1]));
    }

    if (url.pathname.startsWith("/api/")) {
      return new Response("Not found", { status: 404 });
    }

    return serveAssetOrSpa(request, env);
  },
};

async function serveAssetOrSpa(request: Request, env: KyoWorkerEnv): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/docs" || url.pathname === "/docs/") {
    return Response.redirect(`${url.origin}/docs/overview`, 302);
  }

  if (url.pathname === "/embed/infinite-mac") {
    return env.ASSETS.fetch(rewriteRequest(request, "/embed/infinite-mac.html"));
  }

  const direct = await env.ASSETS.fetch(rewriteRootRequest(request));
  if (direct.status !== 404) return addAssetHeaders(url.pathname, direct);

  const htmlPage = await fetchHtmlPage(request, env);
  if (htmlPage.status !== 404) return addAssetHeaders(url.pathname, htmlPage);

  const root = `/${url.pathname.split("/").filter(Boolean)[0] ?? ""}`;
  if (APP_REWRITE_PATHS.has(root) || request.headers.get("Sec-Fetch-Mode") === "navigate") {
    return env.ASSETS.fetch(rewriteRequest(request, "/index.html"));
  }

  return direct;
}

function rewriteRootRequest(request: Request): Request {
  const url = new URL(request.url);
  if (url.pathname !== "/") return request;
  return rewriteRequest(request, "/index.html");
}

function fetchHtmlPage(request: Request, env: KyoWorkerEnv): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/" || hasFileExtension(url.pathname)) {
    return Promise.resolve(new Response(null, { status: 404 }));
  }

  const pathname = url.pathname.endsWith("/")
    ? `${url.pathname}index.html`
    : `${url.pathname}.html`;
  return env.ASSETS.fetch(rewriteRequest(request, pathname));
}

function rewriteRequest(request: Request, pathname: string): Request {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url.toString(), request);
}

function addAssetHeaders(pathname: string, response: Response): Response {
  const headers = new Headers(response.headers);
  if (isImmutableAsset(pathname)) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  if (pathname.startsWith("/fonts/")) {
    headers.set("Access-Control-Allow-Origin", "*");
  }
  if (pathname.endsWith("/manifest.json") || pathname === "/version.json") {
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isImmutableAsset(pathname: string): boolean {
  return [
    "/fonts/",
    "/wallpapers/tiles/",
    "/wallpapers/photos/",
    "/icons/default/",
    "/icons/macosx/",
    "/icons/system7/",
    "/icons/win98/",
    "/icons/xp/",
    "/sounds/",
    "/patterns/",
  ].some((prefix) => pathname.startsWith(prefix));
}

function hasFileExtension(pathname: string): boolean {
  return /\/[^/]+\.[^/]+$/.test(pathname);
}
