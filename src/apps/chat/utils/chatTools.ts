/**
 * [INPUT]: 依赖 useBookmarkStore, useStickiesStore, useLinkMetaStore, useKyoItemStore
 * [OUTPUT]: detectIntent / executeIntent — 聊天意图检测与执行
 * [POS]: apps/chat/utils 的意图处理层，被 ChatApp handleSubmit 拦截消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useBookmarkStore } from "@/stores/useBookmarkStore";
import { useStickiesStore } from "@/stores/useStickiesStore";
import { useLinkMetaStore } from "@/stores/useLinkMetaStore";
import { searchItems, getRecent } from "@/stores/useKyoItemStore";
import { supabase } from "@/lib/supabase";
import { warmPreview } from "@/components/layout/BookmarkHoverCard";
import type { KyoItem } from "@/types/kyoItem";

// ─── 意图类型 ─────────────────────────────────────────────────────────────────

export type ChatIntent =
  | { type: "create_note"; content: string }
  | { type: "save_url"; url: string }
  | { type: "search"; query: string }
  | { type: "recent"; days: number }
  | { type: "delete_note" }
  | { type: "summary"; query: string }
  | { type: "none" };

// ─── URL 提取 ─────────────────────────────────────────────────────────────────

const URL_REGEX = /https?:\/\/\S+/i;

function extractUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

// ─── 意图检测 ─────────────────────────────────────────────────────────────────

const NOTE_PATTERNS = [
  /^记一下[：:]\s*/,
  /^note[：:]\s*/i,
  /^记录[：:]\s*/,
  /^备忘[：:]\s*/,
  /^memo[：:]\s*/i,
];

const SAVE_URL_PATTERNS = [
  /帮我存一下/,
  /save\s+(this\s+)?(url|link)/i,
  /收藏一下/,
  /存一下这个/,
  /保存链接/,
];

const SEARCH_PATTERNS = [
  /我存过.*关于(.+)的/,
  /有没有.*关于(.+)的/,
  /搜索(.+)/,
  /search\s+(.+)/i,
  /find\s+(.+)/i,
];

const RECENT_PATTERNS = [
  /这周我存了什么/,
  /最近存了什么/,
  /this week/i,
  /recent\s+items/i,
];

const DELETE_NOTE_PATTERNS = [
  /删掉.*便签/,
  /删除.*便签/,
  /delete.*note/i,
  /remove.*sticky/i,
];

const SUMMARY_PATTERNS = [
  /那篇.*讲了什么/,
  /那个.*说了什么/,
  /summarize/i,
  /总结一下/,
];

export function detectIntent(text: string): ChatIntent {
  // 创建便签
  for (const pattern of NOTE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return { type: "create_note", content: text.slice(match[0].length).trim() };
    }
  }

  // 保存 URL
  const url = extractUrl(text);
  if (url && SAVE_URL_PATTERNS.some((p) => p.test(text))) {
    return { type: "save_url", url };
  }

  // 搜索
  for (const pattern of SEARCH_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return { type: "search", query: match[1].trim() };
    }
  }

  // 最近
  if (RECENT_PATTERNS.some((p) => p.test(text))) {
    return { type: "recent", days: 7 };
  }

  // 删除便签
  if (DELETE_NOTE_PATTERNS.some((p) => p.test(text))) {
    return { type: "delete_note" };
  }

  // 总结文章
  if (SUMMARY_PATTERNS.some((p) => p.test(text))) {
    return { type: "summary", query: text };
  }

  return { type: "none" };
}

// ─── 意图执行 ─────────────────────────────────────────────────────────────────

export async function executeIntent(intent: ChatIntent): Promise<string | null> {
  switch (intent.type) {
    case "create_note": {
      const { addNote, updateNote } = useStickiesStore.getState();
      const id = addNote(undefined, null, false);
      updateNote(id, { content: intent.content });
      return `已创建便签 ✏️`;
    }

    case "save_url": {
      const { getBookmarkByUrl, addAiBookmark, addBookmark } = useBookmarkStore.getState();
      const linkMetaStore = useLinkMetaStore.getState();

      if (getBookmarkByUrl(intent.url)) {
        return "这个链接已经存过了 📌";
      }

      // 有缓存直接用
      if (linkMetaStore.has(intent.url)) {
        const meta = linkMetaStore.get(intent.url)!;
        addAiBookmark(meta.title, intent.url, meta.summary, meta.tags);
        return `已保存: ${meta.title} 🔖`;
      }

      // 先占位，异步抓取
      let hostname = "example.com";
      try { hostname = new URL(intent.url).hostname; } catch { /* noop */ }
      const tempId = addBookmark(hostname, intent.url);
      warmPreview(intent.url);

      const userId = (await supabase.auth.getSession()).data.session?.user?.id;

      try {
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: intent.url, bookmarkId: tempId, userId }),
        });
        if (res.ok) {
          const meta = await res.json();
          linkMetaStore.set(intent.url, meta);
          const updates: Record<string, unknown> = { title: meta.title };
          if (meta.summary) updates.summary = meta.summary;
          if (meta.tags?.length) updates.tags = meta.tags;
          useBookmarkStore.getState().updateBookmark(tempId, updates);
          return `已保存: ${meta.title} 🔖`;
        }
      } catch { /* noop */ }

      return `已保存链接 🔖`;
    }

    case "search": {
      const results = searchItems(intent.query);
      if (results.length === 0) return `没有找到关于「${intent.query}」的内容`;
      return formatItemList(results.slice(0, 5), `关于「${intent.query}」的结果`);
    }

    case "recent": {
      const items = getRecent(intent.days);
      if (items.length === 0) return "最近没有新增内容";
      return formatItemList(items.slice(0, 10), `最近 ${intent.days} 天的内容`);
    }

    case "delete_note": {
      const notes = useStickiesStore.getState().notes;
      if (notes.length === 0) return "没有便签可以删除";
      const last = notes[notes.length - 1];
      useStickiesStore.getState().deleteNote(last.id);
      return `已删除便签: "${last.content.slice(0, 20)}..."`;
    }

    case "summary": {
      // 返回 null 让 ChatApp 将搜索结果作为 context 发给 API
      return null;
    }

    default:
      return null;
  }
}

// ─── 格式化 ──────────────────────────────────────────────────────────────────

function formatItemList(items: KyoItem[], title: string): string {
  const lines = [`**${title}** (${items.length}条)\n`];
  for (const item of items) {
    if (item.type === "bookmark") {
      lines.push(`🔖 [${item.title}](${item.url})`);
    } else {
      lines.push(`📝 ${item.content.slice(0, 50)}`);
    }
  }
  return lines.join("\n");
}

// ─── 为 API 调用生成 context ──────────────────────────────────────────────────

export function getContextForIntent(intent: ChatIntent): string | undefined {
  if (intent.type === "summary") {
    // 找最近的书签，把 summary 作为 context
    const items = getRecent(30).filter((i) => i.type === "bookmark");
    if (items.length === 0) return undefined;
    return items
      .slice(0, 5)
      .map((i) => (i.type === "bookmark" ? `${i.title}: ${i.summary || i.url}` : ""))
      .filter(Boolean)
      .join("\n");
  }

  if (intent.type === "search") {
    const results = searchItems(intent.query);
    if (results.length === 0) return undefined;
    return results
      .slice(0, 5)
      .map((i) =>
        i.type === "bookmark"
          ? `🔖 ${i.title} (${i.url}): ${i.summary}`
          : `📝 ${i.content.slice(0, 100)}`
      )
      .join("\n");
  }

  return undefined;
}
