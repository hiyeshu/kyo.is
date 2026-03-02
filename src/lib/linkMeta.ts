/**
 * [INPUT]: 依赖 @/stores/useLinkMetaStore 本地缓存，依赖 /api/scrape 端点
 * [OUTPUT]: 对外提供 fetchLinkMeta 函数，三层缓存获取 URL 元数据
 * [POS]: lib/ 的链接元数据获取层，被 usePasteHandler 和 AddWebsiteDialog 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useLinkMetaStore } from "@/stores/useLinkMetaStore";
import type { LinkMeta } from "@/types/kyoItem";
import i18n from "@/lib/i18n";

/**
 * 三层缓存获取 URL 元数据
 * 1. 本地 store（内存 + localStorage）
 * 2. Supabase link_meta 表（通过 /api/scrape 端点透传）
 * 3. LinkMeta API（通过 /api/scrape 端点调用）
 *
 * 传入 bookmarkId + userId 时，scrape 端点会直接将结果写入 kyo_items，
 * 即使客户端断开也不会丢失 Dify 生成的 summary/tags。
 */
export async function fetchLinkMeta(
  url: string,
  opts?: { bookmarkId?: string; userId?: string }
): Promise<LinkMeta> {
  const store = useLinkMetaStore.getState();

  if (store.has(url)) {
    return store.get(url)!;
  }

  const res = await fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      lang: i18n.language,
      bookmarkId: opts?.bookmarkId,
      userId: opts?.userId,
    }),
  });

  if (!res.ok) throw new Error("Scrape failed");

  const meta: LinkMeta = await res.json();
  store.set(url, meta);

  return meta;
}
