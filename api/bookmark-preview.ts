/**
 * [INPUT]: 接收 GET 查询参数 url/width/height/format/quality/block_ads/timeout
 * [OUTPUT]: 对外提供 GET /api/bookmark-preview，同源代理 PageShot 截图二进制流
 * [POS]: api/ 的书签预览代理端点，被 BookmarkHoverCard 消费，用于规避浏览器跨域图片拦截
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const config = {
  runtime: "edge",
};

const PAGESHOT_ENDPOINT = "https://pageshot.site/v1/screenshot";

function clampInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): string {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return String(fallback);
  return String(Math.min(max, Math.max(min, parsed)));
}

function normalizeBool(value: string | null, fallback: boolean): string {
  if (value === null) return fallback ? "true" : "false";
  return value === "true" ? "true" : "false";
}

function normalizeFormat(value: string | null): string {
  if (value === "png" || value === "jpeg" || value === "webp") return value;
  return "webp";
}

function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url");
  if (!rawUrl) return badRequest("Missing url");

  let normalizedUrl = "";
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return badRequest("Only http/https urls are allowed");
    }
    normalizedUrl = parsed.toString();
  } catch {
    return badRequest("Invalid url");
  }

  const upstreamParams = new URLSearchParams({
    url: normalizedUrl,
    width: clampInt(searchParams.get("width"), 800, 320, 3840),
    height: clampInt(searchParams.get("height"), 500, 200, 2160),
    format: normalizeFormat(searchParams.get("format")),
    quality: clampInt(searchParams.get("quality"), 70, 1, 100),
    block_ads: normalizeBool(searchParams.get("block_ads"), true),
    timeout: clampInt(searchParams.get("timeout"), 15000, 5000, 60000),
  });

  const upstreamUrl = `${PAGESHOT_ENDPOINT}?${upstreamParams.toString()}`;

  try {
    const upstream = await fetch(upstreamUrl, { method: "GET" });
    if (!upstream.ok || !upstream.body) {
      return new Response(
        JSON.stringify({
          error: "Preview fetch failed",
          status: upstream.status,
        }),
        {
          status: upstream.status || 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const contentType = upstream.headers.get("Content-Type") || "image/webp";
    if (!contentType.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: "Invalid upstream content type" }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=21600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Preview proxy unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
