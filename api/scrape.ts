/**
 * [INPUT]: 依赖环境变量 DIFY_API_KEY / VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，接收 { url, no_cache? } POST 请求
 * [OUTPUT]: 返回 LinkMeta（title/description/ogImage/faviconUrl/siteName/themeColor/summary/tags）
 * [POS]: api/ 的网页元数据端点，LinkMeta API + Supabase 缓存，被 usePasteHandler 和 chatTools 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createClient } from "@supabase/supabase-js";

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
      summary: data.description?.slice(0, 200) || "",
      tags: [],
      fetchedAt: new Date(data.fetched_at).getTime(),
    };
  } catch {
    return null;
  }
}

// ─── Supabase 缓存：写 ──────────────────────────────────────────────────────

async function writeCache(result: ScrapeResult): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  try {
    await sb.from("link_meta").upsert({
      url: result.url,
      title: result.title,
      description: result.description,
      og_image: result.ogImage || null,
      favicon_url: result.faviconUrl || null,
      site_name: result.siteName || null,
      theme_color: result.themeColor || null,
      fetched_at: new Date().toISOString(),
    });
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
  const apiUrl = `https://api.linkmeta.io/v1?url=${encodeURIComponent(targetUrl)}`;
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

  return res.json();
}

// ─── AI 摘要生成（可选，Dify 不可用时降级） ──────────────────────────────────

async function generateAiMeta(title: string, description: string, url: string): Promise<{ summary: string; tags: string[] }> {
  if (!DIFY_API_KEY) {
    return { summary: description.slice(0, 200), tags: [] };
  }

  try {
    const prompt = `为以下网页生成一句话中文摘要和3-5个标签。
标题: ${title}
描述: ${description}
URL: ${url}

请严格按 JSON 格式返回: {"summary":"...","tags":["...",]}`;

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

// ─── 主处理函数 ───────────────────────────────────────────────────────────────

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = (await req.json()) as { url: string; no_cache?: boolean };
    const { url, no_cache } = body;

    if (!url || typeof url !== "string") {
      return new Response("Missing url", { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return new Response("Invalid url", { status: 400 });
    }

    // 1. 查 Supabase 缓存
    if (!no_cache) {
      const cached = await readCache(url);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // 2. 调 LinkMeta API
    const meta = await fetchFromLinkMeta(url);
    const title = meta.title || new URL(url).hostname;
    const description = meta.description || "";

    // 3. AI 生成摘要和标签
    const { summary, tags } = await generateAiMeta(title, description, url);

    const result: ScrapeResult = {
      url,
      title,
      description,
      ogImage: meta.image || undefined,
      faviconUrl: meta.favicon || undefined,
      siteName: meta.siteName || undefined,
      themeColor: meta.themeColor || undefined,
      summary,
      tags,
      fetchedAt: Date.now(),
    };

    // 4. 写入缓存（不阻塞响应）
    writeCache(result);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response("Scrape failed", { status: 500 });
  }
}
