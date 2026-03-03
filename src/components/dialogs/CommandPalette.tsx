/**
 * [INPUT]: cmdk, useBookmarkStore, useStickiesStore, useBrowserDataStore, useThemeStore, appRegistry, useAppStore, i18n
 * [OUTPUT]: CommandPalette 组件, HighlightText 关键词高亮
 * [POS]: 统一搜索浮层，搜索应用 + 书签 + 便签 + 浏览器原生书签/历史，纯客户端 scoreItem 评分搜索（秒开），
 *        搜索结果根据命中字段展示命中原因 + 全量关键词高亮（加粗+蓝色），浏览器数据与 kyo 书签按 URL 去重，被 AppManager 挂载
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Command } from "cmdk";
import { useEffect, useRef, useState } from "react";
import { useBookmarkStore, getBookmarkIconInfo, openBookmarkUrl, type Bookmark } from "@/stores/useBookmarkStore";
import { useStickiesStore } from "@/stores/useStickiesStore";
import { useLinkMetaStore } from "@/stores/useLinkMetaStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useAppStore } from "@/stores/useAppStore";
import { appRegistry, getAppIconPath } from "@/config/appRegistry";
import type { AppId } from "@/config/appRegistry";
import { getTranslatedAppName } from "@/utils/i18n";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { MagnifyingGlass, Plus, CopySimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { BookmarkFaviconImg } from "@/components/shared/BookmarkFaviconImg";
import { scoreItem, getMatchInfo } from "@/utils/searchScore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useBrowserDataStore, type BrowserBookmark, type BrowserHistoryItem } from "@/stores/useBrowserDataStore";

// ─── 复制按钮（hover 显示，点击复制后自动关闭搜索）─────────────────────────

function CopyButton({ text, onCopied }: { text: string; onCopied?: () => void }) {
  return (
    <button
      type="button"
      className="shrink-0 opacity-0 group-hover:opacity-60 group-data-[selected=true]:opacity-100 hover:!opacity-100 transition-all p-1 rounded cursor-pointer hover:bg-black/15 group-data-[selected=true]:bg-white group-data-[selected=true]:text-black group-data-[selected=true]:hover:bg-gray-100"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        toast.success("已复制");
        onCopied?.();
      }}
    >
      <CopySimple className="w-3.5 h-3.5" />
    </button>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialSearch?: string;
}

type FlatBookmark = Bookmark;

// URL 检测：有协议头，或者 xxx.xxx 格式（无空格）
function looksLikeUrl(input: string): boolean {
  if (/^https?:\/\//i.test(input)) return true;
  return /^[^\s]+\.[a-z]{2,}(\/\S*)?$/i.test(input);
}

function normalizeUrl(input: string): string {
  return /^https?:\/\//i.test(input) ? input : `https://${input}`;
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

// ─── 相关性评分 → @/utils/searchScore ──────────────────────────────────────

/**
 * 高亮文本中所有匹配的搜索关键词（不只是第一个）
 * 长文本先截取到命中区域附近，再对截取结果做全量高亮
 */
function HighlightText({ text, query, maxLen = 80 }: { text: string; query: string; maxLen?: number }) {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const firstIdx = lower.indexOf(q);

  if (firstIdx === -1) {
    return <span>{text.length > maxLen ? text.slice(0, maxLen) + "…" : text}</span>;
  }

  // 长文本：以首次命中为中心截取窗口
  let display = text;
  let prefix = "";
  let suffix = "";
  if (text.length > maxLen) {
    const pad = Math.floor((maxLen - query.length) / 2);
    const start = Math.max(0, firstIdx - pad);
    const end = Math.min(text.length, start + maxLen);
    if (start > 0) prefix = "…";
    if (end < text.length) suffix = "…";
    display = text.slice(start, end);
  }

  // 拆分：遍历所有匹配位置
  const parts: React.ReactNode[] = [];
  const dl = display.toLowerCase();
  let cursor = 0;
  let i = dl.indexOf(q, cursor);
  while (i !== -1) {
    if (i > cursor) parts.push(display.slice(cursor, i));
    parts.push(<mark key={i} className="search-highlight">{display.slice(i, i + q.length)}</mark>);
    cursor = i + q.length;
    i = dl.indexOf(q, cursor);
  }
  if (cursor < display.length) parts.push(display.slice(cursor));

  return <span>{prefix}{parts}{suffix}</span>;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const macPanelStyle: React.CSSProperties = {
  borderRadius: "14px",
  backgroundColor: "var(--os-color-window-bg, #ffffff)",
  backgroundImage: "var(--os-pinstripe-window)",
  border: "0.5px solid rgba(0, 0, 0, 0.15)",
  boxShadow:
    "0 24px 80px rgba(0, 0, 0, 0.28), " +
    "0 8px 24px rgba(0, 0, 0, 0.12), " +
    "0 0 0 0.5px rgba(255, 255, 255, 0.5) inset",
  overflow: "hidden",
};

const macInputStyle: React.CSSProperties = {
  fontFamily: "var(--os-font-ui)",
  fontSize: "20px",
  fontWeight: 400,
  letterSpacing: "-0.02em",
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
  const currentTheme = useThemeStore((s) => s.current);
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const searchRef = useRef("");

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

  // ─── 客户端过滤 + 相关性排序 ─────────────────────────────────────────────────
  // 应用：只匹配翻译后的名称（避免英文 ID 产生噪音），最多 3 条
  const filteredApps = q
    ? appList
        .map((a) => ({ ...a, _score: scoreItem(q, { title: a.name }) }))
        .filter((a) => a._score >= 60)
        .sort((a, b) => b._score - a._score)
        .slice(0, 3)
    : [];

  // 书签：分数 >= 40（至少域名级命中），最多 6 条
  const filteredBookmarks = q
    ? allBookmarks
        .map((bm) => ({
          ...bm,
          _score: scoreItem(q, {
            title: bm.title, url: bm.url, summary: bm.summary,
            tags: bm.tags, createdAt: new Date(bm.createdAt).getTime(),
          }),
        }))
        .filter((bm) => bm._score >= 40)
        .sort((a, b) => b._score - a._score)
        .slice(0, 6)
    : [];

  // 便签：分数 >= 25（至少内容命中），最多 4 条
  const filteredNotes = q
    ? notes
        .map((n) => ({
          ...n,
          _score: scoreItem(q, {
            title: n.content.slice(0, 60), text: n.content,
            tags: n.tags, createdAt: n.createdAt,
          }),
        }))
        .filter((n) => n._score >= 25)
        .sort((a, b) => b._score - a._score)
        .slice(0, 4)
    : [];

  // ─── 浏览器原生数据过滤（插件注入时才有数据）──────────────────────────────
  const { bookmarks: browserBookmarks, history: browserHistory, loaded: browserLoaded } = useBrowserDataStore();

  // kyo 书签 URL 集合，用于去重
  const kyoUrlSet = new Set(allBookmarks.map((bm) => bm.url));

  const filteredBrowserBookmarks: (BrowserBookmark & { _score: number })[] = q && browserLoaded
    ? browserBookmarks
        .filter((bb) => !kyoUrlSet.has(bb.url))
        .map((bb) => ({ ...bb, _score: scoreItem(q, { title: bb.title, url: bb.url }) }))
        .filter((bb) => bb._score >= 40)
        .sort((a, b) => b._score - a._score)
        .slice(0, 4)
    : [];

  const filteredBrowserHistory: (BrowserHistoryItem & { _score: number })[] = q && browserLoaded
    ? browserHistory
        .filter((bh) => !kyoUrlSet.has(bh.url))
        .map((bh) => ({ ...bh, _score: scoreItem(q, { title: bh.title, url: bh.url }) }))
        .filter((bh) => bh._score >= 35)
        .sort((a, b) => b._score - a._score)
        .slice(0, 4)
    : [];

  // URL 检测
  const trimmedSearch = search.trim();
  const isUrlInput = trimmedSearch.length > 0 && looksLikeUrl(trimmedSearch);

  // 空状态判断（手动，因为 shouldFilter=false）
  const bookmarkCount = filteredBookmarks.length;
  const noteCount = filteredNotes.length;
  const isEmpty = q.length > 0 && filteredApps.length === 0 && bookmarkCount === 0 && noteCount === 0 && !isUrlInput;

  // 搜索已改为纯客户端（数据已通过 initialSync + Realtime 同步到本地）

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
    fontSize: isMacTheme ? "13px" : "14px",
    fontFamily: isMacTheme
      ? "var(--os-font-ui)"
      : isXpTheme
      ? '"Pixelated MS Sans Serif", Tahoma, Arial'
      : "var(--os-font-ui, Geneva)",
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10010]" onClick={() => onOpenChange(false)}>
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: isMacTheme
            ? "rgba(0, 0, 0, 0.25)"
            : "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      />

      {/* Command Panel */}
      <div
        className="absolute left-1/2 top-[18%] -translate-x-1/2 w-full max-w-[640px] px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={getPanelStyle()}>
          <div 
            className={isMacTheme ? "bg-white/85" : ""}
            style={isMacTheme ? { borderRadius: "14px", overflow: "hidden" } : undefined}
          >
            <Command className="overflow-hidden bg-transparent" loop shouldFilter={false}>
          {/* Input Area */}
          <div
            className="flex items-center gap-3 px-4"
            style={{
              borderBottom: q
                ? (isMacTheme
                    ? "1px solid rgba(0, 0, 0, 0.12)"
                    : isXpTheme
                    ? "1px solid #ACA899"
                    : "1px solid rgba(0, 0, 0, 0.15)")
                : "none",
              backgroundColor: isXpTheme ? "#ffffff" : undefined,
            }}
          >
            <MagnifyingGlass
              className="shrink-0"
              size={isMacTheme ? 22 : 18}
              weight="regular"
              style={{
                color: isMacTheme
                  ? "rgba(0, 0, 0, 0.3)"
                  : isXpTheme
                  ? "#0054E3"
                  : "#666666",
              }}
            />
            <Command.Input
              ref={inputRef}
              value={search}
              onValueChange={(v) => { setSearch(v); searchRef.current = v; }}
              placeholder={t("common.search.appsAndBookmarks", "搜索应用和书签...")}
              className="w-full bg-transparent outline-none placeholder:text-black/20"
              style={isMacTheme ? { ...macInputStyle, padding: "18px 0" } : {
                fontSize: "15px",
                padding: "16px 0",
                fontFamily: isXpTheme
                  ? '"Pixelated MS Sans Serif", Tahoma, Arial'
                  : "var(--os-font-ui, Geneva)",
              }}
            />
            {q && (
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
            )}
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
            {isEmpty && (
              <div
                className="py-6 text-center"
                style={{
                  fontSize: isMacTheme ? "13px" : "14px",
                  color: "rgba(0, 0, 0, 0.4)",
                  fontFamily: isMacTheme ? "var(--os-font-ui)" : isXpTheme ? '"Pixelated MS Sans Serif", Tahoma, Arial' : undefined,
                }}
              >
                {t("common.search.noResults", "找不到结果")}
              </div>
            )}

            {/* URL 检测 → 添加书签 */}
            {isUrlInput && (
              <Command.Group>
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

            {/* 书签组 */}
            {filteredBookmarks.length > 0 && (
              <Command.Group>
                {filteredBookmarks.map((bm) => {
                    const iconInfo = getBookmarkIconInfo(bm);
                    const match = q ? getMatchInfo(q, { title: bm.title, summary: bm.summary, tags: bm.tags, url: bm.url }) : null;
                    return (
                      <Command.Item
                        key={bm.url}
                        value={`${bm.title} ${bm.url}`}
                        onSelect={() => handleSelectBookmark(bm.url)}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-2 cursor-pointer"
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
                            style={{ borderRadius: "22%" }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-semibold text-[14px]">
                              {q ? <HighlightText text={bm.title} query={q} maxLen={50} /> : bm.title}
                            </span>
                            {bm.tags?.length > 0 && (
                              <span className="shrink-0 flex items-center gap-1">
                                {bm.tags.slice(0, 2).map((tag) => {
                                  const isTagMatched = q && tag.toLowerCase().includes(q.toLowerCase());
                                  return (
                                    <span
                                      key={tag}
                                      className={cn(
                                        "bookmark-tag text-[10px] px-2 py-0.5 rounded-full",
                                        isTagMatched
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-gray-100 text-gray-600"
                                      )}
                                    >
                                      {tag}
                                    </span>
                                  );
                                })}
                              </span>
                            )}
                          </div>
                          <div className="truncate text-[11px] text-gray-600">
                            {match?.field === "summary" && match.text ? (
                              // 命中描述：显示描述片段
                              <HighlightText text={match.text} query={q} maxLen={80} />
                            ) : (
                              // 未命中描述：显示 URL
                              <span className="text-gray-500">
                                {extractDomain(bm.url)}
                              </span>
                            )}
                          </div>
                        </div>
                        <CopyButton text={bm.url} onCopied={() => onOpenChange(false)} />
                      </Command.Item>
                    );
                  })}
                </Command.Group>
            )}

            {/* 便签组 */}
            {filteredNotes.length > 0 && (
              <Command.Group>
                {filteredNotes.map((note) => (
                    <Command.Item
                      key={note.id}
                      value={note.content}
                      onSelect={() => handleSelectNote(note.id)}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2 cursor-pointer",
                        "data-[selected=true]:text-white"
                      )}
                      style={{ borderRadius: isMacTheme ? "5px" : "2px", ...itemFontStyle }}
                    >
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center text-sm self-start mt-0.5">
                        📝
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-semibold text-[14px]">
                          {q ? <HighlightText text={note.content} query={q} maxLen={50} /> : note.content.slice(0, 50)}
                        </div>
                        <div className="truncate text-[8px] text-gray-500 font-light">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <CopyButton text={note.content} onCopied={() => onOpenChange(false)} />
                      <span
                        className="shrink-0 w-3 h-3 rounded-full"
                        style={{ backgroundColor: `var(--os-sticky-${note.color}, #fef08a)` }}
                      />
                    </Command.Item>
                  ))}
                </Command.Group>
            )}

            {/* 浏览器书签组（插件注入，去重后显示） */}
            {filteredBrowserBookmarks.length > 0 && (
              <Command.Group>
                {filteredBrowserBookmarks.map((bb) => (
                  <Command.Item
                    key={`bb-${bb.id}`}
                    value={`${bb.title} ${bb.url}`}
                    onSelect={() => handleSelectBookmark(bb.url)}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 cursor-pointer",
                      "data-[selected=true]:text-white"
                    )}
                    style={{ borderRadius: isMacTheme ? "5px" : "2px", ...itemFontStyle }}
                  >
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${extractDomain(bb.url)}&sz=32`}
                      alt=""
                      className="w-4 h-4 shrink-0 object-contain"
                      style={{ borderRadius: "22%" }}
                      onError={(e) => { (e.target as HTMLImageElement).src = "/icons/default/internet.png"; }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-[14px]">
                          <HighlightText text={bb.title} query={q} maxLen={50} />
                        </span>
                        {bb.folder && (
                          <span
                            className="bookmark-tag shrink-0"
                            style={{
                              fontSize: "9px",
                              padding: "1px 5px",
                              borderRadius: "3px",
                              backgroundColor: "rgba(0, 0, 0, 0.06)",
                              color: "rgba(0, 0, 0, 0.4)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {bb.folder}
                          </span>
                        )}
                      </div>
                      <div className="truncate" style={{ fontSize: isMacTheme ? "10px" : "11px", opacity: 0.4 }}>
                        {extractDomain(bb.url)}
                      </div>
                    </div>
                    <CopyButton text={bb.url} onCopied={() => onOpenChange(false)} />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* 最近访问组（浏览器历史，插件注入） */}
            {filteredBrowserHistory.length > 0 && (
              <Command.Group>
                {filteredBrowserHistory.map((bh) => (
                  <Command.Item
                    key={`bh-${bh.id}`}
                    value={`${bh.title} ${bh.url}`}
                    onSelect={() => handleSelectBookmark(bh.url)}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 cursor-pointer",
                      "data-[selected=true]:text-white"
                    )}
                    style={{ borderRadius: isMacTheme ? "5px" : "2px", ...itemFontStyle }}
                  >
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${extractDomain(bh.url)}&sz=32`}
                      alt=""
                      className="w-4 h-4 shrink-0 object-contain"
                      style={{ borderRadius: "22%" }}
                      onError={(e) => { (e.target as HTMLImageElement).src = "/icons/default/internet.png"; }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-semibold text-[14px]">
                        <HighlightText text={bh.title} query={q} maxLen={50} />
                      </div>
                      <div className="truncate text-[11px] text-gray-500">
                        {extractDomain(bh.url)}
                        {bh.visitCount > 1 && (
                          <span style={{ opacity: 0.7 }}> · {bh.visitCount} {t("common.search.visits", "次访问")}</span>
                        )}
                      </div>
                    </div>
                    <CopyButton text={bh.url} onCopied={() => onOpenChange(false)} />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* 应用组 */}
            {filteredApps.length > 0 && (
              <Command.Group>
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
                    <span className="truncate">
                      {q ? <HighlightText text={app.name} query={q} maxLen={40} /> : app.name}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* 问问 Kyo 兜底 — 有输入且非 URL 时始终显示 */}
            {trimmedSearch && !isUrlInput && (
              <Command.Group>
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
                    className="w-4 h-4 shrink-0 object-contain self-start mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-semibold text-[14px]">
                      {trimmedSearch}
                    </div>
                    <div className="truncate text-[11px] text-gray-500">
                      {t("common.search.askKyoInChat", "在聊天中问 Kyo")}
                    </div>
                  </div>
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

          {/* Footer：有输入时才显示 */}
          {!isMobile && q && (
          <div
            className="flex items-center justify-between px-3 py-1.5"
            style={{
              borderTop: isMacTheme
                ? "1px solid rgba(0, 0, 0, 0.08)"
                : isXpTheme
                ? "1px solid #ACA899"
                : "1px solid rgba(0, 0, 0, 0.15)",
              fontSize: isMacTheme ? "9px" : "10px",
              color: "rgba(0, 0, 0, 0.3)",
              fontFamily: isMacTheme ? "var(--os-font-ui)" : isXpTheme ? '"Pixelated MS Sans Serif", Tahoma, Arial' : undefined,
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
          )}
        </Command>
          </div>
        </div>
      </div>

      {/* cmdk 选中样式 + macOS 滚动条 */}
      <style>{`
        .search-highlight {
          background: #dbeafe;
          color: inherit;
          font-weight: inherit;
          padding: 0 1px;
          border-radius: 2px;
        }
        [cmdk-item][data-selected=true] .search-highlight {
          background: #bfdbfe;
        }
        [cmdk-item][data-selected=true] {
          background-color: #e0e0e0;
          color: inherit;
        }
        [cmdk-item][data-selected=true] .search-highlight {
          color: inherit !important;
        }
        [cmdk-item][data-selected=true] .bookmark-tag {
          background-color: #d4d4d4 !important;
          color: #666666 !important;
        }
        [cmdk-group-heading] {
          padding: 4px 8px;
          font-size: ${isMacTheme ? "11px" : "10px"};
          color: rgba(0, 0, 0, 0.35);
          font-family: ${isMacTheme ? "var(--os-font-ui)" : isXpTheme ? '"Pixelated MS Sans Serif", Tahoma, Arial' : "inherit"};
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        /* macOS 风格滚动条 */
        [cmdk-list]::-webkit-scrollbar {
          width: 8px;
        }
        [cmdk-list]::-webkit-scrollbar-track {
          background: transparent;
        }
        [cmdk-list]::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        [cmdk-list]::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
          border: 2px solid transparent;
          background-clip: padding-box;
        }
      `}</style>
    </div>
  );
}
