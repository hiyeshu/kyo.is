/**
 * [INPUT]: cmdk, useBookmarkStore, useStickiesStore, useThemeStore, appRegistry, useAppStore, i18n, usePasteHandler logic
 * [OUTPUT]: CommandPalette 组件
 * [POS]: 统一搜索浮层，搜索应用 + 书签 + 便签，支持 URL 添加书签 + Ask AI 兜底，被 AppManager 挂载
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Command } from "cmdk";
import { useEffect, useRef, useState } from "react";
import { useBookmarkStore, isFolder, getBookmarkIconInfo, openBookmarkUrl, type Bookmark } from "@/stores/useBookmarkStore";
import { useStickiesStore } from "@/stores/useStickiesStore";
import { useLinkMetaStore } from "@/stores/useLinkMetaStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useAppStore } from "@/stores/useAppStore";
import { appRegistry, getAppIconPath } from "@/config/appRegistry";
import type { AppId } from "@/config/appRegistry";
import { getTranslatedAppName } from "@/utils/i18n";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialSearch?: string;
}

interface FlatBookmark extends Bookmark {
  folderTitle?: string;
}

// URL 检测：有协议头，或者 xxx.xxx 格式（无空格）
function looksLikeUrl(input: string): boolean {
  if (/^https?:\/\//i.test(input)) return true;
  return /^[^\s]+\.[a-z]{2,}(\/\S*)?$/i.test(input);
}

function normalizeUrl(input: string): string {
  return /^https?:\/\//i.test(input) ? input : `https://${input}`;
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
  const currentTheme = useThemeStore((s) => s.current);
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const searchRef = useRef("");

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

  // 展平所有书签（包括文件夹内的）
  const allBookmarks: FlatBookmark[] = items.flatMap((item) =>
    isFolder(item)
      ? item.bookmarks.map((bm) => ({ ...bm, folderTitle: item.title }))
      : [item]
  );

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
    const tempId = addBookmark(hostname, url, undefined, undefined, { onDesktop: true });
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

  // 是否显示 URL 添加选项
  const trimmedSearch = search.trim();
  const isUrlInput = trimmedSearch.length > 0 && looksLikeUrl(trimmedSearch);

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
        <Command className="overflow-hidden" style={getPanelStyle()} loop>
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
            <Command.Empty
              className="py-6 text-center"
              style={{
                fontSize: isMacTheme ? "13px" : isXpTheme ? "11px" : "12px",
                color: "rgba(0, 0, 0, 0.4)",
                fontFamily: isMacTheme ? "var(--os-font-ui)" : undefined,
              }}
            >
              {t("common.search.noResults", "找不到结果")}
            </Command.Empty>

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

            {/* 应用组 */}
            <Command.Group heading={t("common.search.appsGroup", "应用")}>
              {appList.map((app) => (
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

            {/* 书签组 */}
            <Command.Group heading={t("common.search.bookmarksGroup", "书签")}>
              {allBookmarks.map((bm) => {
                const iconInfo = getBookmarkIconInfo(bm);
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
                      <img
                        src={iconInfo.value}
                        alt=""
                        className="w-4 h-4 shrink-0 object-contain"
                        style={{ borderRadius: "3px" }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/icons/default/internet.png";
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{bm.title}</div>
                      <div
                        className="truncate"
                        style={{ fontSize: isMacTheme ? "11px" : "9px", opacity: 0.5 }}
                      >
                        {bm.url}
                      </div>
                    </div>
                    {bm.folderTitle && (
                      <span
                        className="shrink-0"
                        style={{
                          padding: "2px 6px",
                          borderRadius: isMacTheme ? "4px" : "2px",
                          fontSize: "10px",
                          backgroundColor: "rgba(0, 0, 0, 0.06)",
                          color: "rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        {bm.folderTitle}
                      </span>
                    )}
                  </Command.Item>
                );
              })}
            </Command.Group>

            {/* 便签组 */}
            {notes.length > 0 && (
              <Command.Group heading={t("common.search.notesGroup", "便签")}>
                {notes
                  .filter((note) => note.content.trim().length > 0)
                  .map((note) => (
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
                        {note.content.slice(0, 60)}
                      </div>
                    </div>
                    <span
                      className="shrink-0 w-3 h-3 rounded-full"
                      style={{ backgroundColor: `var(--os-sticky-${note.color}, #fef08a)` }}
                    />
                  </Command.Item>
                ))}
              </Command.Group>
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
