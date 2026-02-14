/**
 * [INPUT]: cmdk, useBookmarkStore, useThemeStore
 * [OUTPUT]: CommandPalette 组件
 * [POS]: 全局书签搜索面板，被 AppManager 挂载，⌘F 触发
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Command } from "cmdk";
import { useEffect, useRef, useState } from "react";
import { useBookmarkStore, isFolder, getBookmarkIconInfo, openBookmarkUrl, type Bookmark } from "@/stores/useBookmarkStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { MagnifyingGlass } from "@phosphor-icons/react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FlatBookmark extends Bookmark {
  folderTitle?: string;
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

const system7PanelStyle: React.CSSProperties = {
  backgroundColor: "var(--os-color-window-bg, #ffffff)",
  backgroundImage: "var(--os-pinstripe-window)",
  border: "var(--os-metrics-border-width, 1px) solid var(--os-color-window-border, #000000)",
  boxShadow: "var(--os-window-shadow, 2px 2px 0px #000000)",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function CommandPalette({ isOpen, onOpenChange }: CommandPaletteProps) {
  const { t } = useTranslation();
  const { items } = useBookmarkStore();
  const currentTheme = useThemeStore((s) => s.current);
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  // 展平所有书签（包括文件夹内的）
  const allBookmarks: FlatBookmark[] = items.flatMap((item) =>
    isFolder(item)
      ? item.bookmarks.map((bm) => ({ ...bm, folderTitle: item.title }))
      : [item]
  );

  // 过滤书签
  const filteredBookmarks = search
    ? allBookmarks.filter(
        (bm) =>
          bm.title.toLowerCase().includes(search.toLowerCase()) ||
          bm.url.toLowerCase().includes(search.toLowerCase())
      )
    : allBookmarks;

  // 打开时聚焦输入框 + ESC 关闭
  useEffect(() => {
    if (!isOpen) return;

    setSearch("");
    setTimeout(() => inputRef.current?.focus(), 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onOpenChange]);

  // 打开书签
  const handleSelect = (url: string) => {
    openBookmarkUrl(url);
    onOpenChange(false);
  };

  // 主题判断
  const isMacTheme = currentTheme === "macosx";
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  const isSystem7 = false;

  // 面板样式
  const getPanelStyle = (): React.CSSProperties => {
    if (isMacTheme) return macPanelStyle;
    if (isXpTheme) return xpPanelStyle;
    if (isSystem7) return system7PanelStyle;
    return {};
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
              onValueChange={setSearch}
              placeholder={t("common.search.bookmarks", "Search bookmarks...")}
              className="w-full py-3 bg-transparent outline-none"
              style={isMacTheme ? macInputStyle : {
                fontSize: isXpTheme ? "11px" : "12px",
                fontFamily: isXpTheme
                  ? '"Pixelated MS Sans Serif", Arial'
                  : "var(--os-font-ui, Geneva)",
              }}
            />
            {/* Shortcut hint */}
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
              {t("common.search.noResults", "No bookmarks found")}
            </Command.Empty>

              {filteredBookmarks.map((bm) => {
                const iconInfo = getBookmarkIconInfo(bm);
                return (
                  <Command.Item
                    key={bm.url}
                    value={`${bm.title} ${bm.url}`}
                    onSelect={() => handleSelect(bm.url)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 cursor-pointer",
                      "data-[selected=true]:text-white"
                    )}
                    style={{
                      borderRadius: isMacTheme ? "5px" : "2px",
                      fontSize: isMacTheme ? "13px" : isXpTheme ? "11px" : "12px",
                      fontFamily: isMacTheme
                        ? "var(--os-font-ui)"
                        : isXpTheme
                        ? '"Pixelated MS Sans Serif", Arial'
                        : "var(--os-font-ui, Geneva)",
                    }}
                  >
                    {/* Icon - 单一真相源 */}
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

                {/* Title & URL */}
                <div className="flex-1 min-w-0">
                  <div className="truncate">{bm.title}</div>
                  <div
                    className="truncate"
                    style={{
                      fontSize: isMacTheme ? "11px" : "9px",
                      opacity: 0.5,
                    }}
                  >
                    {bm.url}
                  </div>
                </div>

                {/* Folder badge */}
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
            <span>{t("apps.bookmarks.countBookmarks", "{{count}} 個書籤", { count: filteredBookmarks.length })}</span>
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
      `}</style>
    </div>
  );
}
