/**
 * [INPUT]: 依赖 @/stores/useLinkMetaStore 本地缓存，依赖 /api/scrape 端点
 * [OUTPUT]: 对外提供 fetchLinkMeta 函数，三层缓存获取 URL 元数据
 * [POS]: lib/ 的链接元数据获取层，被 usePasteHandler 和 AddWebsiteDialog 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useLinkMetaStore } from "@/stores/useLinkMetaStore";
import type { LinkMeta } from "@/types/kyoItem";

/**
 * 三层缓存获取 URL 元数据
 * 1. 本地 store（内存 + localStorage）
 * 2. Supabase link_meta 表（通过 /api/scrape 端点透传）
 * 3. LinkMeta API（通过 /api/scrape 端点调用）
 */
export async function fetchLinkMeta(url: string): Promise<LinkMeta> {
  const store = useLinkMetaStore.getState();

  // 层 1：本地 store 缓存
  if (store.has(url)) {
    return store.get(url)!;
  }

  // 层 2+3：/api/scrape 内部处理 Supabase 缓存 + LinkMeta API
  const res = await fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) throw new Error("Scrape failed");

  const meta: LinkMeta = await res.json();

  // 写入本地 store 缓存
  store.set(url, meta);

  return meta;
}
