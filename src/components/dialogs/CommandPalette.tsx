/**
 * [INPUT]: cmdk, useBookmarkStore, useStickiesStore, useAuthStore, supabase, useThemeStore, appRegistry, useAppStore, i18n
 * [OUTPUT]: CommandPalette 组件, getMatchInfo 命中推断, HighlightText 关键词高亮
 * [POS]: 统一搜索浮层，搜索应用 + 书签 + 便签，已登录时 debounced Supabase RPC ILIKE 搜索，未登录时客户端过滤，
 *        搜索结果根据命中字段（title/summary/text/tags/url）展示命中原因 + 关键词高亮，被 AppManager 挂载
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Command } from "cmdk";
import { useEffect, useRef, useState } from "react";
import { useBookmarkStore, getBookmarkIconInfo, openBookmarkUrl, type Bookmark } from "@/stores/useBookmarkStore";
import { useStickiesStore } from "@/stores/useStickiesStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { supabase } from "@/lib/supabase";
import { useLinkMetaStore } from "@/stores/useLinkMetaStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useAppStore } from "@/stores/useAppStore";
import { appRegistry, getAppIconPath } from "@/config/appRegistry";
import type { AppId } from "@/config/appRegistry";
import { getTranslatedAppName } from "@/utils/i18n";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { MagnifyingGlass, Plus, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";
import { BookmarkFaviconImg } from "@/components/shared/BookmarkFaviconImg";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialSearch?: string;
}

type FlatBookmark = Bookmark;

// Supabase RPC 返回的 kyo_items 行
interface ServerItem {
  id: string;
  type: "bookmark" | "note";
  title: string | null;
  url: string | null;
  summary: string | null;
  text: string | null;
  favicon: string | null;
  tags: string[] | null;
  color: string | null;
  on_desktop: boolean | null;
  created_at: string;
}

// URL 检测：有协议头，或者 xxx.xxx 格式（无空格）
function looksLikeUrl(input: string): boolean {
  if (/^https?:\/\//i.test(input)) return true;
  return /^[^\s]+\.[a-z]{2,}(\/\S*)?$/i.test(input);
}

function normalizeUrl(input: string): string {
  return /^https?:\/\//i.test(input) ? input : `https://${input}`;
}

// ─── 搜索命中推断 ─────────────────────────────────────────────────────────────

type MatchField = "title" | "summary" | "text" | "tags" | "url" | "none";

interface MatchInfo {
  field: MatchField;
  /** 需要展示给用户的命中文本（title 命中时为 null，不需要副文本） */
  text: string | null;
}

/**
 * 按优先级推断搜索命中的字段，返回应展示的文本
 * - title 命中 → 不显示副文本（标题已足够说明）
 * - summary/text/url 命中 → 显示该字段内容
 * - tags 命中 → 显示 summary（tag 不直接暴露给用户）
 */
function getMatchInfo(
  query: string,
  fields: { title?: string | null; summary?: string | null; text?: string | null; tags?: string[] | null; url?: string | null },
): MatchInfo {
  const q = query.toLowerCase();
  if (fields.title && fields.title.toLowerCase().includes(q)) return { field: "title", text: null };
  if (fields.summary && fields.summary.toLowerCase().includes(q)) return { field: "summary", text: fields.summary };
  if (fields.text && fields.text.toLowerCase().includes(q)) return { field: "text", text: fields.text };
  if (fields.tags?.some((t) => t.toLowerCase().includes(q))) return { field: "tags", text: fields.summary || null };
  if (fields.url && fields.url.toLowerCase().includes(q)) return { field: "url", text: fields.url };
  return { field: "none", text: null };
}

/**
 * 高亮文本中的搜索关键词
 * 截取关键词附近的片段（前后各 30 字符），用 <mark> 高亮
 */
function HighlightText({ text, query, maxLen = 80 }: { text: string; query: string; maxLen?: number }) {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);

  if (idx === -1) {
    // 未命中（tags → summary 场景），直接截取
    return <span>{text.length > maxLen ? text.slice(0, maxLen) + "…" : text}</span>;
  }

  // 计算截取窗口：以命中位置为中心
  const pad = Math.floor((maxLen - query.length) / 2);
  const start = Math.max(0, idx - pad);
  const end = Math.min(text.length, idx + query.length + pad);
  const before = (start > 0 ? "…" : "") + text.slice(start, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length, end) + (end < text.length ? "…" : "");

  return (
    <span>
      {before}
      <mark style={{ backgroundColor: "rgba(255, 210, 0, 0.35)", color: "inherit", borderRadius: "2px", padding: "0 1px" }}>
        {match}
      </mark>
      {after}
    </span>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const macPanelStyle: React.CSSProperties = {
  borderRadius: "var(--os-metrics-radius, 7.2px)",
  backgroundColor: "var(--os-color-window-bg, #ececec)",
  backgroundImage: "var(--os-pinstripe-window)",
  border: "0.5px solid rgba(0, 0, 0, 0.4)",
  boxShadow: "var(--os-window-shadow, 0 3px 10px rgba(0, 0, 0, 0.3))",
  overflow: "hidden",
};

const macInputStyle: React.CSSProperties = {
  fontFamily: "var(--os-font-ui)",
  fontSize: "13px",
  WebkitFontSmoothing: "antialiased",
};

const xpPanelStyle: React.CSSProperties = {
  backgroundColor: "var(--os-color-window-bg, #ECE9D8)",
  backgroundImage: "var(--os-pinstripe-window)",
  border: "var(--os-metrics-border-width, 2px) solid var(--os-color-window-border, #0054E3)",
  boxShadow: "var(--os-window-shadow, 2px 2px 8px rgba(0, 0, 0, 0.3))",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function CommandPalette({ isOpen, onOpenChange, initialSearch = "" }: CommandPaletteProps) {
  const { t } = useTranslation();
  const { items, getBookmarkByUrl, addBookmark, updateBookmark } = useBookmarkStore();
  const { notes } = useStickiesStore();
  const user = useAuthStore((s) => s.user);
  const currentTheme = useThemeStore((s) => s.current);
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const searchRef = useRef("");

  // ─── 服务端搜索状态 ──────────────────────────────────────────────────────────
  const [serverResults, setServerResults] = useState<ServerItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const q = search.trim().toLowerCase();

  // 应用列表 - 使用主题感知图标
  const appList = Object.entries(appRegistry).map(([id]) => {
    const appId = id as AppId;
    return {
      id: appId,
      name: getTranslatedAppName(appId),
      icon: getAppIconPath(appId, currentTheme),
      searchLabel: `${getTranslatedAppName(appId)} ${appId}`,
    };
  });

  const allBookmarks: FlatBookmark[] = items as FlatBookmark[];

  // ─── 客户端过滤 ──────────────────────────────────────────────────────────────
  // 应用：始终客户端即时过滤
  const filteredApps = q
    ? appList.filter((a) => a.searchLabel.toLowerCase().includes(q))
    : appList;

  // 书签：扩展搜索范围到 title + url + summary + tags
  const filteredBookmarks = q
    ? allBookmarks.filter((bm) => {
        const haystack = [bm.title, bm.url, bm.summary || "", (bm.tags || []).join(" ")].join(" ").toLowerCase();
        return haystack.includes(q);
      })
    : allBookmarks;

  // 便签：搜索 content
  const filteredNotes = q
    ? notes.filter((n) => n.content.toLowerCase().includes(q))
    : notes.filter((n) => n.content.trim().length > 0);

  // ─── 服务端 vs 客户端决策 ────────────────────────────────────────────────────
  const useServer = !!user && q.length > 0;
  const serverBookmarks = serverResults.filter((r) => r.type === "bookmark");
  const serverNotes = serverResults.filter((r) => r.type === "note");

  const displayBookmarks = useServer ? serverBookmarks : null;
  const displayNotes = useServer ? serverNotes : null;

  // URL 检测
  const trimmedSearch = search.trim();
  const isUrlInput = trimmedSearch.length > 0 && looksLikeUrl(trimmedSearch);

  // 空状态判断（手动，因为 shouldFilter=false）
  const bookmarkCount = useServer ? serverBookmarks.length : filteredBookmarks.length;
  const noteCount = useServer ? serverNotes.length : filteredNotes.length;
  const isEmpty = q.length > 0 && filteredApps.length === 0 && bookmarkCount === 0 && noteCount === 0 && !isUrlInput;

  // ─── 服务端搜索 debounce ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !search.trim()) {
      setServerResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data, error } = await supabase.rpc("search_items", { q: search.trim() });
      if (!error && data) setServerResults(data as ServerItem[]);
      else setServerResults([]);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [search, user]);

  // 打开时聚焦输入框 + 填入初始字符 + ESC/Tab 处理
  useEffect(() => {
    if (!isOpen) return;

    setSearch(initialSearch);
    searchRef.current = initialSearch;
    setTimeout(() => {
      const input = inputRef.current;
      if (input) {
        input.focus();
        // 光标移到末尾
        input.setSelectionRange(initialSearch.length, initialSearch.length);
      }
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
      // Tab → 问问 AI（有输入且非 URL）
      const q = searchRef.current.trim();
      if (e.key === "Tab" && q && !looksLikeUrl(q)) {
        e.preventDefault();
        useAppStore.getState().launchApp("chat" as AppId, { autoSend: q });
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onOpenChange, initialSearch]);

  // 选中应用 → 启动
  const handleSelectApp = (appId: AppId) => {
    useAppStore.getState().launchApp(appId);
    onOpenChange(false);
  };

  // 选中书签 → 打开
  const handleSelectBookmark = (url: string) => {
    openBookmarkUrl(url);
    onOpenChange(false);
  };

  // 问问 Kyo → 打开聊天窗口并自动发送
  const handleAskAi = () => {
    useAppStore.getState().launchApp("chat" as AppId, { autoSend: search.trim() });
    onOpenChange(false);
  };

  // 选中便签 → 聚焦
  const handleSelectNote = (noteId: string) => {
    useStickiesStore.getState().bringToFront(noteId);
    // 确保 Stickies 应用已打开
    useAppStore.getState().launchApp("stickies" as AppId);
    onOpenChange(false);
  };

  // 输入是 URL → 添加书签 + 打开
  const handleAddBookmarkFromUrl = () => {
    const url = normalizeUrl(search.trim());

    // 去重
    if (getBookmarkByUrl(url)) {
      openBookmarkUrl(url);
      onOpenChange(false);
      return;
    }

    // 先创建占位书签
    let hostname = "example.com";
    try { hostname = new URL(url).hostname; } catch { /* noop */ }
    const tempId = addBookmark(hostname, url, undefined, { onDesktop: true });
    toast(t("paste.fetchingMeta", "正在获取网页信息..."));

    // 异步抓取元数据
    fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((meta) => {
        useLinkMetaStore.getState().set(url, meta);
        updateBookmark(tempId, {
          title: meta.title,
          summary: meta.summary,
          tags: meta.tags,
        });
        toast(t("paste.bookmarkUpdated", "书签信息已更新"));
      })
      .catch(() => {});

    openBookmarkUrl(url);
    onOpenChange(false);
  };

  // 主题判断
  const isMacTheme = currentTheme === "macosx";
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

  const getPanelStyle = (): React.CSSProperties => {
    if (isMacTheme) return macPanelStyle;
    if (isXpTheme) return xpPanelStyle;
    return {};
  };

  const itemFontStyle: React.CSSProperties = {
    fontSize: isMacTheme ? "13px" : isXpTheme ? "11px" : "12px",
    fontFamily: isMacTheme
      ? "var(--os-font-ui)"
      : isXpTheme
      ? '"Pixelated MS Sans Serif", Arial'
      : "var(--os-font-ui, Geneva)",
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]" onClick={() => onOpenChange(false)}>
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: isMacTheme
            ? "rgba(0, 0, 0, 0.3)"
            : "rgba(0, 0, 0, 0.5)",
        }}
      />

      {/* Command Panel */}
      <div
        className="absolute left-1/2 top-[20%] -translate-x-1/2 w-full max-w-[520px] px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="overflow-hidden" style={getPanelStyle()} loop shouldFilter={false}>
          {/* Input Area */}
          <div
            className="flex items-center gap-2 px-3"
            style={{
              borderBottom: isMacTheme
                ? "1px solid rgba(0, 0, 0, 0.15)"
                : isXpTheme
                ? "1px solid #ACA899"
                : "1px solid rgba(0, 0, 0, 0.2)",
              backgroundColor: isXpTheme ? "#ffffff" : undefined,
            }}
          >
            {isSearching ? (
              <CircleNotch
                className="shrink-0 animate-spin"
                size={16}
                weight="regular"
                style={{
                  color: isMacTheme
                    ? "rgba(0, 0, 0, 0.4)"
                    : isXpTheme
                    ? "#0054E3"
                    : "#666666",
                }}
              />
            ) : (
              <MagnifyingGlass
                className="shrink-0"
                size={16}
                weight="regular"
                style={{
                  color: isMacTheme
                    ? "rgba(0, 0, 0, 0.4)"
                    : isXpTheme
                    ? "#0054E3"
                    : "#666666",
                }}
              />
            )}
            <Command.Input
              ref={inputRef}
              value={search}
              onValueChange={(v) => { setSearch(v); searchRef.current = v; }}
              placeholder={t("common.search.appsAndBookmarks", "搜索应用和书签...")}
              className="w-full py-3 bg-transparent outline-none"
              style={isMacTheme ? macInputStyle : {
                fontSize: isXpTheme ? "11px" : "12px",
                fontFamily: isXpTheme
                  ? '"Pixelated MS Sans Serif", Arial'
                  : "var(--os-font-ui, Geneva)",
              }}
            />
            <kbd
              className="hidden sm:inline-flex items-center shrink-0"
              style={{
                padding: "2px 6px",
                borderRadius: isMacTheme ? "4px" : "2px",
                fontSize: "10px",
                backgroundColor: isMacTheme
                  ? "rgba(0, 0, 0, 0.06)"
                  : isXpTheme
                  ? "#D4D0C8"
                  : "#f0f0f0",
                color: isMacTheme ? "rgba(0, 0, 0, 0.4)" : "#666666",
                border: isXpTheme ? "1px solid #808080" : undefined,
              }}
            >
              ESC
            </kbd>
          </div>

          {/* List */}
          <Command.List
            className="overflow-y-auto"
            style={{
              maxHeight: "320px",
              padding: isMacTheme ? "6px" : "4px",
            }}
          >
            {/* 手动空状态（shouldFilter=false 时 Command.Empty 不可靠） */}
            {isEmpty && !isSearching && (
              <div
                className="py-6 text-center"
                style={{
                  fontSize: isMacTheme ? "13px" : isXpTheme ? "11px" : "12px",
                  color: "rgba(0, 0, 0, 0.4)",
                  fontFamily: isMacTheme ? "var(--os-font-ui)" : undefined,
                }}
              >
                {t("common.search.noResults", "找不到结果")}
              </div>
            )}

            {/* URL 检测 → 添加书签 */}
            {isUrlInput && (
              <Command.Group heading={t("common.search.actions", "操作")}>
                <Command.Item
                  value={`__add_url__ ${trimmedSearch}`}
                  onSelect={handleAddBookmarkFromUrl}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 cursor-pointer",
                    "data-[selected=true]:text-white"
                  )}
                  style={{ borderRadius: isMacTheme ? "5px" : "2px", ...itemFontStyle }}
                >
                  <Plus className="w-4 h-4 shrink-0" weight="bold" />
                  <span className="truncate">
                    {t("common.search.addBookmark", "添加到收藏")} — {trimmedSearch}
                  </span>
                </Command.Item>
              </Command.Group>
            )}

            {/* 应用组 — 始终客户端过滤 */}
            {filteredApps.length > 0 && (
              <Command.Group heading={t("common.search.appsGroup", "应用")}>
                {filteredApps.map((app) => (
                  <Command.Item
                    key={app.id}
                    value={app.searchLabel}
                    onSelect={() => handleSelectApp(app.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 cursor-pointer",
                      "data-[selected=true]:text-white"
                    )}
                    style={{ borderRadius: isMacTheme ? "5px" : "2px", ...itemFontStyle }}
                  >
                    <img
                      src={app.icon}
                      alt=""
                      className="w-4 h-4 shrink-0 object-contain"
                      style={{ borderRadius: "3px" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/icons/default/application.png";
                      }}
                    />
                    <span className="truncate">{app.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* 书签组 — 服务端结果 or 客户端过滤 */}
            {displayBookmarks ? (
              displayBookmarks.length > 0 && (
                <Command.Group heading={t("common.search.bookmarksGroup", "书签")}>
                  {displayBookmarks.map((item) => {
                    const match = q ? getMatchInfo(q, { title: item.title, summary: item.summary, text: item.text, tags: item.tags, url: item.url }) : null;
                    return (
                      <Command.Item
                        key={item.id}
                        value={`${item.title || ""} ${item.url || ""}`}
                        onSelect={() => item.url && handleSelectBookmark(item.url)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 cursor-pointer",
                          "data-[selected=true]:text-white"
                        )}
                        style={{ borderRadius: isMacTheme ? "5px" : "2px", ...itemFontStyle }}
                      >
                        <img
                          src={item.favicon || "/icons/default/internet.png"}
                          alt=""
                          className="w-4 h-4 shrink-0 object-contain self-start mt-0.5"
                          style={{ borderRadius: "3px" }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/icons/default/internet.png";
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{item.title || item.url}</div>
                          {match?.text && match.field !== "title" ? (
                            <div className="truncate" style={{ fontSize: isMacTheme ? "11px" : "9px", opacity: 0.6 }}>
                              <HighlightText text={match.text} query={q} />
                            </div>
                          ) : (
                            <div className="truncate" style={{ fontSize: isMacTheme ? "11px" : "9px", opacity: 0.5 }}>
                              {item.url}
                            </div>
                          )}
                        </div>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )
            ) : (
              filteredBookmarks.length > 0 && (
                <Command.Group heading={t("common.search.bookmarksGroup", "书签")}>
                  {filteredBookmarks.map((bm) => {
                    const iconInfo = getBookmarkIconInfo(bm);
                    const match = q ? getMatchInfo(q, { title: bm.title, summary: bm.summary, tags: bm.tags, url: bm.url }) : null;
                    return (
                      <Command.Item
                        key={bm.url}
                        value={`${bm.title} ${bm.url}`}
                        onSelect={() => handleSelectBookmark(bm.url)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 cursor-pointer",
                          "data-[selected=true]:text-white"
                        )}
                        style={{ borderRadius: isMacTheme ? "5px" : "2px", ...itemFontStyle }}
                      >
                        {iconInfo.isEmoji ? (
                          <span className="w-4 h-4 shrink-0 flex items-center justify-center text-sm">
                            {iconInfo.value}
                          </span>
                        ) : (
                          <BookmarkFaviconImg
                            bookmarkId={bm.id}
                            src={iconInfo.value}
                            bookmarkUrl={bm.url}
                            bookmarkTitle={bm.title}
                            faviconResolved={bm.faviconResolved}
                            className="w-4 h-4 shrink-0 object-contain self-start mt-0.5"
                            style={{ borderRadius: "3px" }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{bm.title}</div>
                          {match?.text && match.field !== "title" ? (
                            <div className="truncate" style={{ fontSize: isMacTheme ? "11px" : "9px", opacity: 0.6 }}>
                              <HighlightText text={match.text} query={q} />
                            </div>
                          ) : (
                            <div className="truncate" style={{ fontSize: isMacTheme ? "11px" : "9px", opacity: 0.5 }}>
                              {bm.url}
                            </div>
                          )}
                        </div>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )
            )}

            {/* 便签组 — 服务端结果 or 客户端过滤 */}
            {displayNotes ? (
              displayNotes.length > 0 && (
                <Command.Group heading={t("common.search.notesGroup", "便签")}>
                  {displayNotes.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={item.text || ""}
                      onSelect={() => handleSelectNote(item.id)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 cursor-pointer",
                        "data-[selected=true]:text-white"
                      )}
                      style={{ borderRadius: isMacTheme ? "5px" : "2px", ...itemFontStyle }}
                    >
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center text-sm">
                        📝
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate">
                          {q ? <HighlightText text={(item.text || "").slice(0, 120)} query={q} /> : (item.text || "").slice(0, 60)}
                        </div>
                      </div>
                      <span
                        className="shrink-0 w-3 h-3 rounded-full"
                        style={{ backgroundColor: `var(--os-sticky-${item.color || "yellow"}, #fef08a)` }}
                      />
                    </Command.Item>
                  ))}
                </Command.Group>
              )
            ) : (
              filteredNotes.length > 0 && (
                <Command.Group heading={t("common.search.notesGroup", "便签")}>
                  {filteredNotes.map((note) => (
                    <Command.Item
                      key={note.id}
                      value={note.content}
                      onSelect={() => handleSelectNote(note.id)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 cursor-pointer",
                        "data-[selected=true]:text-white"
                      )}
                      style={{ borderRadius: isMacTheme ? "5px" : "2px", ...itemFontStyle }}
                    >
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center text-sm">
                        📝
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate">
                          {q ? <HighlightText text={note.content.slice(0, 120)} query={q} /> : note.content.slice(0, 60)}
                        </div>
                      </div>
                      <span
                        className="shrink-0 w-3 h-3 rounded-full"
                        style={{ backgroundColor: `var(--os-sticky-${note.color}, #fef08a)` }}
                      />
                    </Command.Item>
                  ))}
                </Command.Group>
              )
            )}

            {/* 问问 Kyo 兜底 — 有输入且非 URL 时始终显示 */}
            {trimmedSearch && !isUrlInput && (
              <Command.Group heading="Kyo">
                <Command.Item
                  value={`__ask_ai__ ${trimmedSearch}`}
                  onSelect={handleAskAi}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 cursor-pointer",
                    "data-[selected=true]:text-white"
                  )}
                  style={{ borderRadius: isMacTheme ? "5px" : "2px", ...itemFontStyle }}
                >
                  <img
                    src="/favicon.svg"
                    alt=""
                    className="w-4 h-4 shrink-0 object-contain"
                  />
                  <span className="flex-1 truncate">
                    {t("common.search.askKyo", "问问 Kyo")} → {trimmedSearch}
                  </span>
                  <kbd
                    className="shrink-0"
                    style={{
                      padding: "1px 5px",
                      borderRadius: isMacTheme ? "4px" : "2px",
                      fontSize: "10px",
                      backgroundColor: isMacTheme
                        ? "rgba(0, 0, 0, 0.06)"
                        : isXpTheme
                        ? "#D4D0C8"
                        : "#f0f0f0",
                      color: isMacTheme ? "rgba(0, 0, 0, 0.4)" : "#666666",
                      border: isXpTheme ? "1px solid #808080" : undefined,
                    }}
                  >
                    Tab
                  </kbd>
                </Command.Item>
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{
              borderTop: isMacTheme
                ? "1px solid rgba(0, 0, 0, 0.1)"
                : isXpTheme
                ? "1px solid #ACA899"
                : "1px solid rgba(0, 0, 0, 0.15)",
              fontSize: "10px",
              color: "rgba(0, 0, 0, 0.4)",
              fontFamily: isMacTheme ? "var(--os-font-ui)" : undefined,
            }}
          >
            <span>
              {appList.length} {t("common.search.appsGroup", "应用")} · {allBookmarks.length} {t("common.search.bookmarksGroup", "书签")} · {notes.length} {t("common.search.notesGroup", "便签")}
            </span>
            <div className="flex items-center gap-3">
              <span>↵ {t("common.action.open", "開啟")}</span>
              <span>ESC {t("common.action.close", "關閉")}</span>
            </div>
          </div>
        </Command>
      </div>

      {/* cmdk 选中样式 */}
      <style>{`
        [cmdk-item][data-selected=true] {
          background-color: ${
            isMacTheme
              ? "rgba(39, 101, 202, 0.88)"
              : isXpTheme
              ? "#0054E3"
              : "#000000"
          };
          color: #ffffff;
        }
        [cmdk-item][data-selected=true] span {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        [cmdk-item][data-selected=true] mark {
          background-color: rgba(255, 255, 255, 0.2) !important;
          color: #ffffff !important;
        }
        [cmdk-group-heading] {
          padding: 4px 8px;
          font-size: ${isMacTheme ? "11px" : "10px"};
          color: rgba(0, 0, 0, 0.4);
          font-family: ${isMacTheme ? "var(--os-font-ui)" : "inherit"};
        }
      `}</style>
    </div>
  );
}
