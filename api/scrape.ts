/**
 * [INPUT]: 依赖环境变量 DIFY_API_KEY / VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，接收 { url, no_cache? } POST 请求
 * [OUTPUT]: 返回 LinkMeta（title/description/ogImage/faviconUrl/siteName/themeColor/summary/tags）
 * [POS]: api/ 的网页元数据端点，LinkMeta API + Supabase 缓存，被 usePasteHandler 和 chatTools 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";

export const config = {
  runtime: "edge",
};

interface ScrapeResult {
  url: string;
  title: string;
  description: string;
  ogImage?: string;
  faviconUrl?: string;
  siteName?: string;
  themeColor?: string;
  summary: string;
  tags: string[];
  fetchedAt: number;
}

const DIFY_API_BASE = "https://api.dify.ai/v1";
const DIFY_API_KEY = process.env.DIFY_API_KEY;

// ─── Supabase 客户端（Edge 环境） ────────────────────────────────────────────

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ─── Supabase 缓存：读 ──────────────────────────────────────────────────────

async function readCache(targetUrl: string): Promise<ScrapeResult | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data } = await sb
      .from("link_meta")
      .select("*")
      .eq("url", targetUrl)
      .single();

    if (!data) return null;

    return {
      url: data.url,
      title: data.title || "",
      description: data.description || "",
      ogImage: data.og_image || undefined,
      faviconUrl: data.favicon_url || undefined,
      siteName: data.site_name || undefined,
      themeColor: data.theme_color || undefined,
      summary: data.summary || data.description?.slice(0, 200) || "",
      tags: data.tags || [],
      fetchedAt: new Date(data.fetched_at).getTime(),
    };
  } catch {
    return null;
  }
}

// ─── Supabase 缓存：写 ──────────────────────────────────────────────────────

async function writeCache(data: Record<string, unknown>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  try {
    await sb.from("link_meta").upsert(data);
  } catch {
    // 写缓存失败不影响主流程
  }
}

// ─── LinkMeta API 调用 ──────────────────────────────────────────────────────

interface LinkMetaApiResponse {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  themeColor?: string;
}

async function fetchFromLinkMeta(targetUrl: string): Promise<LinkMetaApiResponse> {
  const apiUrl = `https://linkmeta.dev/api/v1/extract?url=${encodeURIComponent(targetUrl)}`;
  const res = await fetch(apiUrl, {
    signal: AbortSignal.timeout(8000),
  });

  // 容错：400/422/504 等错误码
  if (!res.ok) {
    if ([400, 422, 504].includes(res.status)) {
      return {};
    }
    throw new Error(`LinkMeta API error: ${res.status}`);
  }

  const json = await res.json();
  // LinkMeta 响应格式: { status: "success", data: { title, description, image, favicon, ... } }
  return json.data || {};
}

// ─── AI 摘要生成（可选，Dify 不可用时降级） ──────────────────────────────────

async function generateAiMeta(title: string, description: string, url: string, lang = "zh-CN"): Promise<{ summary: string; tags: string[] }> {
  if (!DIFY_API_KEY) {
    return { summary: description.slice(0, 200), tags: [] };
  }

  try {
    const prompt = `For this webpage, generate a short summary (under 20 Chinese characters or 60 English characters) and 2-4 keyword tags. Summary and tags must be in ${lang} language. Summary should capture the core point, not describe the page.
Title: ${title}
Description: ${description}
URL: ${url}

Return JSON only: {"summary":"...","tags":["..."]}`;

    const res = await fetch(`${DIFY_API_BASE}/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIFY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {},
        query: prompt,
        response_mode: "blocking",
        user: "kyo-scraper",
      }),
    });

    if (!res.ok) {
      return { summary: description.slice(0, 200), tags: [] };
    }

    const data = await res.json();
    const answer = data.answer || "";

    const jsonMatch = answer.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || description.slice(0, 200),
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      };
    }

    return { summary: answer.slice(0, 200), tags: [] };
  } catch {
    return { summary: description.slice(0, 200), tags: [] };
  }
}

// ─── 服务端下载 favicon → base64（Edge 环境，无 CORS 限制） ──────────────────

const FAVICON_MAX_BYTES = 50 * 1024; // 50KB 上限
const FAVICON_TIMEOUT_MS = 5000;

async function downloadImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(FAVICON_TIMEOUT_MS),
      headers: { Accept: "image/*" },
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "image/x-icon";
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > FAVICON_MAX_BYTES) return null;

    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:${contentType.split(";")[0]};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

async function fetchFaviconAsBase64(pageUrl: string, linkMetaFavicon: string | undefined | null): Promise<string | null> {
  // 优先级：Icon Horse（多策略最高清）→ Google S2 128px → LinkMeta favicon
  try {
    const hostname = new URL(pageUrl).hostname;

    const iconHorse = `https://icon.horse/icon/${hostname}`;
    const ihResult = await downloadImageAsBase64(iconHorse);
    if (ihResult) return ihResult;

    const googleS2 = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
    const gsResult = await downloadImageAsBase64(googleS2);
    if (gsResult) return gsResult;
  } catch { /* hostname 解析失败，跳过 */ }

  if (linkMetaFavicon) {
    return downloadImageAsBase64(linkMetaFavicon);
  }
  return null;
}

// ─── 服务端直写 kyo_items（需要 service role key 绕过 RLS） ─────────────────

function getServiceSupabase() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function writeBackToKyoItems(
  bookmarkId: string,
  userId: string,
  data: { title: string; summary: string; tags: string[]; favicon: string | null }
): Promise<void> {
  const sb = getServiceSupabase();
  if (!sb) {
    console.warn("[scrape] writeBackToKyoItems skipped: SUPABASE_SERVICE_ROLE_KEY not set");
    return;
  }

  try {
    const { error } = await sb
      .from("kyo_items")
      .update({
        title: data.title,
        summary: data.summary,
        tags: data.tags,
        favicon: data.favicon,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookmarkId)
      .eq("user_id", userId);
    if (error) {
      console.error("[scrape] writeBackToKyoItems failed:", error.code, error.message);
    }
  } catch (e) {
    console.error("[scrape] writeBackToKyoItems error:", e);
  }
}

// ─── 主处理函数 ───────────────────────────────────────────────────────────────

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = (await req.json()) as { url: string; no_cache?: boolean; lang?: string; bookmarkId?: string; userId?: string };
    const { url, no_cache, lang, bookmarkId, userId } = body;

    if (!url || typeof url !== "string") {
      return new Response("Missing url", { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return new Response("Invalid url", { status: 400 });
    }

    // 1. 查 Supabase 缓存（有 summary/tags 直接用，没有则重新生成）
    if (!no_cache) {
      const cached = await readCache(url);
      if (cached) {
        if (cached.summary && cached.tags?.length) {
          if (bookmarkId && userId) {
            waitUntil((async () => {
              const faviconBase64 = await fetchFaviconAsBase64(url, cached.faviconUrl);
              await writeBackToKyoItems(bookmarkId, userId, {
                title: cached.title, summary: cached.summary, tags: cached.tags,
                favicon: faviconBase64 || cached.faviconUrl || null,
              });
            })());
          }
          return new Response(JSON.stringify(cached), {
            headers: { "Content-Type": "application/json" },
          });
        }
        // 缓存无 summary/tags，先返回缓存的基础数据，Dify 放后台
        waitUntil((async () => {
          const aiMeta = await generateAiMeta(cached.title, cached.description, url, lang);
          await writeCache({
            url, title: cached.title, description: cached.description,
            og_image: cached.ogImage || null, favicon_url: cached.faviconUrl || null,
            site_name: cached.siteName || null, theme_color: cached.themeColor || null,
            summary: aiMeta.summary, tags: aiMeta.tags,
            fetched_at: new Date().toISOString(),
          });
          if (bookmarkId && userId) {
            const faviconBase64 = await fetchFaviconAsBase64(url, cached.faviconUrl);
            await writeBackToKyoItems(bookmarkId, userId, {
              title: cached.title, summary: aiMeta.summary, tags: aiMeta.tags,
              favicon: faviconBase64 || cached.faviconUrl || null,
            });
          }
        })());
        return new Response(JSON.stringify(cached), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // 2. 调 LinkMeta API（同步，快，1-3s）
    const meta = await fetchFromLinkMeta(url);
    const title = meta.title || new URL(url).hostname;
    const description = meta.description || "";

    // 3. 立即返回 LinkMeta 结果给客户端（用户先看到真实标题和图标）
    const quickResult: ScrapeResult = {
      url,
      title,
      description,
      ogImage: meta.image || undefined,
      faviconUrl: meta.favicon || undefined,
      siteName: meta.siteName || undefined,
      themeColor: meta.themeColor || undefined,
      summary: "",
      tags: [],
      fetchedAt: Date.now(),
    };

    // 4. Dify + 缓存 + kyo_items 回写全部放到后台（用户不用等）
    waitUntil((async () => {
      const aiMeta = await generateAiMeta(title, description, url, lang);

      await writeCache({
        url,
        title,
        description,
        og_image: meta.image || null,
        favicon_url: meta.favicon || null,
        site_name: meta.siteName || null,
        theme_color: meta.themeColor || null,
        summary: aiMeta.summary,
        tags: aiMeta.tags,
        fetched_at: new Date().toISOString(),
      });

      if (bookmarkId && userId) {
        const faviconBase64 = await fetchFaviconAsBase64(url, meta.favicon);
        await writeBackToKyoItems(bookmarkId, userId, {
          title,
          summary: aiMeta.summary,
          tags: aiMeta.tags,
          favicon: faviconBase64 || meta.favicon || null,
        });
      }
    })());

    return new Response(JSON.stringify(quickResult), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response("Scrape failed", { status: 500 });
  }
}
