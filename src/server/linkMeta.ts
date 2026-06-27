/**
 * [INPUT]: 依赖 ./supabase 的可选 service-role Supabase 客户端、./deepseek 的 classifyContent、./types 的 KyoWorkerEnv
 * [OUTPUT]: resolveLinkMeta，提供可降级链接元数据抓取、DeepSeek 摘要打标、link_meta 缓存写入任务
 * [POS]: server/ 的链接摄取边界，被 Cloudflare /api/scrape 路由消费，隔离外部元数据供应商故障
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyContent } from "./deepseek";
import { createServiceSupabase } from "./supabase";
import type { KyoWorkerEnv } from "./types";

const LINK_META_ENDPOINT = "https://linkmeta.dev/api/v1/extract";

export interface LinkMetaResult {
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

interface LinkMetaCacheRow {
  url: string;
  title: string | null;
  description: string | null;
  og_image: string | null;
  favicon_url: string | null;
  site_name: string | null;
  theme_color: string | null;
  summary: string | null;
  tags: string[] | null;
  fetched_at: string | null;
}

interface LinkMetaApiResponse {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  themeColor?: string;
}

export async function resolveLinkMeta(
  env: KyoWorkerEnv,
  input: { url: string; noCache?: boolean; lang?: string }
): Promise<{ result: LinkMetaResult; cacheWrite?: Promise<void> }> {
  const url = normalizeUrl(input.url);
  const client = createServiceSupabase(env);
  const cached = client && !input.noCache ? await readCache(client, url) : null;
  const base = cached ?? (await fetchLinkMeta(url));
  const enriched = await enrichMeta(env, base, input.lang);

  return {
    result: enriched,
    cacheWrite: client ? writeCache(client, enriched) : undefined,
  };
}

function normalizeUrl(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http/https urls are allowed");
  }
  return parsed.toString();
}

async function readCache(
  client: SupabaseClient,
  url: string
): Promise<LinkMetaResult | null> {
  const { data, error } = await client
    .from("link_meta")
    .select("*")
    .eq("url", url)
    .maybeSingle();

  if (error || !data) return null;
  return fromCacheRow(data as LinkMetaCacheRow);
}

function fromCacheRow(row: LinkMetaCacheRow): LinkMetaResult | null {
  if (!row.title && !row.description) return null;
  return {
    url: row.url,
    title: row.title || new URL(row.url).hostname,
    description: row.description || "",
    ogImage: row.og_image || undefined,
    faviconUrl: row.favicon_url || undefined,
    siteName: row.site_name || undefined,
    themeColor: row.theme_color || undefined,
    summary: row.summary || row.description?.slice(0, 200) || "",
    tags: row.tags || [],
    fetchedAt: row.fetched_at ? new Date(row.fetched_at).getTime() : Date.now(),
  };
}

async function fetchLinkMeta(url: string): Promise<LinkMetaResult> {
  const endpoint = `${LINK_META_ENDPOINT}?url=${encodeURIComponent(url)}`;
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return fallbackLinkMeta(url);

    const body = (await response.json()) as { data?: LinkMetaApiResponse };
    const data = body.data ?? {};

    return {
      ...fallbackLinkMeta(url),
      title: data.title || siteTitle(url),
      description: data.description || "",
      ogImage: data.image,
      faviconUrl: data.favicon,
      siteName: data.siteName,
      themeColor: data.themeColor,
    };
  } catch {
    return fallbackLinkMeta(url);
  }
}

async function enrichMeta(
  env: KyoWorkerEnv,
  base: LinkMetaResult,
  lang = "zh-CN"
): Promise<LinkMetaResult> {
  try {
    const classification = await classifyContent(env, {
      url: base.url,
      title: base.title,
      text: `Language: ${lang}\nDescription: ${base.description}`,
    });

    return {
      ...base,
      title: classification.title || base.title,
      summary: classification.summary || fallbackSummary(base),
      tags: classification.tags.filter(Boolean),
      fetchedAt: Date.now(),
    };
  } catch {
    return {
      ...base,
      summary: fallbackSummary(base),
      tags: base.tags ?? [],
      fetchedAt: Date.now(),
    };
  }
}

function fallbackSummary(base: LinkMetaResult): string {
  return base.summary || base.description.slice(0, 200) || base.title;
}

function fallbackLinkMeta(url: string): LinkMetaResult {
  return {
    url,
    title: siteTitle(url),
    description: "",
    summary: "",
    tags: [],
    fetchedAt: Date.now(),
  };
}

function siteTitle(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

async function writeCache(client: SupabaseClient, meta: LinkMetaResult): Promise<void> {
  const { error } = await client.from("link_meta").upsert({
    url: meta.url,
    title: meta.title,
    description: meta.description,
    og_image: meta.ogImage ?? null,
    favicon_url: meta.faviconUrl ?? null,
    site_name: meta.siteName ?? null,
    theme_color: meta.themeColor ?? null,
    summary: meta.summary,
    tags: meta.tags,
    fetched_at: new Date(meta.fetchedAt).toISOString(),
  });

  if (error) throw error;
}
