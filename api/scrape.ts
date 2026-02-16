/**
 * [INPUT]: 依赖环境变量 DIFY_API_KEY，接收 { url } POST 请求
 * [OUTPUT]: 返回 LinkMeta（title/description/ogImage/summary/tags）
 * [POS]: api/ 的网页抓取端点，被 usePasteHandler 和 chatTools 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const config = {
  runtime: "edge",
};

interface ScrapeResult {
  url: string;
  title: string;
  description: string;
  ogImage?: string;
  summary: string;
  tags: string[];
  fetchedAt: number;
}

const DIFY_API_BASE = "https://api.dify.ai/v1";
const DIFY_API_KEY = process.env.DIFY_API_KEY;

// ─── HTML 元数据提取 ──────────────────────────────────────────────────────────

function extractMeta(html: string, url: string): { title: string; description: string; ogImage?: string } {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch?.[1]?.trim() || new URL(url).hostname;

  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const description = descMatch?.[1]?.trim() || "";

  const ogMatch =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image["']/i);
  const ogImage = ogMatch?.[1]?.trim() || undefined;

  return { title, description, ogImage };
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

    // 尝试从回复中提取 JSON
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
    const { url } = (await req.json()) as { url: string };

    if (!url || typeof url !== "string") {
      return new Response("Missing url", { status: 400 });
    }

    // 验证 URL 格式
    try {
      new URL(url);
    } catch {
      return new Response("Invalid url", { status: 400 });
    }

    // 抓取网页
    const pageRes = await fetch(url, {
      headers: { "User-Agent": "KyoBot/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    const html = await pageRes.text();
    const { title, description, ogImage } = extractMeta(html, url);

    // AI 生成摘要和标签
    const { summary, tags } = await generateAiMeta(title, description, url);

    const result: ScrapeResult = {
      url,
      title,
      description,
      ogImage,
      summary,
      tags,
      fetchedAt: Date.now(),
    };

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response("Scrape failed", { status: 500 });
  }
}
