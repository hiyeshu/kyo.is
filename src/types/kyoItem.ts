/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: KyoItem, KyoBookmarkItem, KyoNoteItem, LinkMeta 类型
 * [POS]: types/ 的统一信息抽象，被 useKyoItemStore 和 useLinkMetaStore 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ─── LinkMeta：网页元数据缓存 ─────────────────────────────────────────────────

export interface LinkMeta {
  url: string;
  title: string;
  description: string;
  ogImage?: string;
  faviconUrl?: string;    // LinkMeta API 返回的 favicon
  siteName?: string;      // 网站名称（og:site_name）
  themeColor?: string;    // 主题色
  summary: string;
  tags: string[];
  fetchedAt: number;
}

// ─── KyoItem：统一信息条目 ────────────────────────────────────────────────────

export interface KyoBookmarkItem {
  type: "bookmark";
  id: string;
  title: string;
  url: string;
  summary: string;
  tags: string[];
  createdAt: number; // unix ms
  favicon?: string;
}

export interface KyoNoteItem {
  type: "note";
  id: string;
  content: string;
  tags: string[];
  createdAt: number; // unix ms
  updatedAt: number;
  color: string;
}

export type KyoItem = KyoBookmarkItem | KyoNoteItem;

export const isKyoBookmark = (item: KyoItem): item is KyoBookmarkItem =>
  item.type === "bookmark";

export const isKyoNote = (item: KyoItem): item is KyoNoteItem =>
  item.type === "note";
