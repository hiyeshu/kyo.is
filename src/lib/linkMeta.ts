/**
 * [INPUT]: 依赖 @/stores/useLinkMetaStore 本地缓存，依赖 /api/scrape 端点
 * [OUTPUT]: 对外提供 fetchLinkMeta 函数，两层缓存获取 URL 元数据
 * [POS]: lib/ 的链接元数据获取层，被 usePasteHandler 和 AddWebsiteDialog 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useLinkMetaStore } from "@/stores/useLinkMetaStore";
import type { LinkMeta } from "@/types/kyoItem";
import i18n from "@/lib/i18n";

/**
 * 两层缓存获取 URL 元数据
 * 1. 本地 store（内存 + localStorage）
 * 2. /api/scrape → Supabase link_meta 缓存 → LinkMeta API
 */
export async function fetchLinkMeta(
  url: string,
  opts?: { skipLocalCache?: boolean }
): Promise<LinkMeta> {
  const store = useLinkMetaStore.getState();

  if (!opts?.skipLocalCache && store.has(url)) {
    return store.get(url)!;
  }

  const res = await fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, lang: i18n.language }),
  });

  if (!res.ok) throw new Error("Scrape failed");

  const meta: LinkMeta = await res.json();
  store.set(url, meta);

  return meta;
}
