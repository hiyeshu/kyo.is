/**
 * [INPUT]: 依赖 useBookmarkStore, useStickiesStore, useLinkMetaStore, sonner toast
 * [OUTPUT]: usePasteHandler hook — 全局 ⌘V 粘贴监听
 * [POS]: hooks/ 的全局粘贴处理器，URL→书签，文本→便签
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect } from "react";
import { toast } from "sonner";
import { useBookmarkStore } from "@/stores/useBookmarkStore";
import { useStickiesStore } from "@/stores/useStickiesStore";
import { useLinkMetaStore } from "@/stores/useLinkMetaStore";
import { useTranslation } from "react-i18next";

const URL_REGEX = /^https?:\/\/\S+$/i;

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    (el as HTMLElement).isContentEditable
  );
}

async function fetchLinkMeta(url: string) {
  const res = await fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error("Scrape failed");
  return res.json();
}

export function usePasteHandler() {
  const { t } = useTranslation();

  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      if (isInputFocused()) return;

      const text = e.clipboardData?.getData("text/plain")?.trim();
      if (!text) return;

      // 阻止默认粘贴行为
      e.preventDefault();

      if (URL_REGEX.test(text)) {
        handleUrlPaste(text, (key, fallback) => t(key, fallback || ""));
      } else {
        handleTextPaste(text, (key, fallback) => t(key, fallback || ""));
      }
    };

    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [t]);
}

// ─── URL 粘贴 → 书签 ─────────────────────────────────────────────────────────

function handleUrlPaste(url: string, t: (key: string, fallback?: string) => string) {
  const { getBookmarkByUrl, addAiBookmark, addBookmark } = useBookmarkStore.getState();
  const linkMetaStore = useLinkMetaStore.getState();

  // 去重
  if (getBookmarkByUrl(url)) {
    toast(t("paste.duplicateUrl", "该链接已存在"));
    return;
  }

  // 有缓存直接用
  if (linkMetaStore.has(url)) {
    const meta = linkMetaStore.get(url)!;
    addAiBookmark(meta.title, url, meta.summary, meta.tags, { onDesktop: true });
    toast(t("paste.bookmarkAdded", "书签已添加"));
    return;
  }

  // 先创建占位书签，异步抓取
  let hostname = "example.com";
  try { hostname = new URL(url).hostname; } catch { /* noop */ }
  const tempId = addBookmark(hostname, url, undefined, undefined, { onDesktop: true });
  toast(t("paste.fetchingMeta", "正在获取网页信息..."));

  fetchLinkMeta(url)
    .then((meta) => {
      linkMetaStore.set(url, meta);
      useBookmarkStore.getState().updateBookmark(tempId, {
        title: meta.title,
        summary: meta.summary,
        tags: meta.tags,
      });
      toast(t("paste.bookmarkUpdated", "书签信息已更新"));
    })
    .catch(() => {
      // 保留占位书签，不删除
    });
}

// ─── 文本粘贴 → 便签 ─────────────────────────────────────────────────────────

function handleTextPaste(text: string, t: (key: string, fallback?: string) => string) {
  const { addNote, updateNote } = useStickiesStore.getState();
  const id = addNote(undefined, null, true);
  updateNote(id, { content: text });
  toast(t("paste.noteCreated", "便签已创建"));
}
