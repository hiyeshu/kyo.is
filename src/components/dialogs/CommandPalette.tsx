/**
 * [INPUT]: cmdk, useBookmarkStore, useThemeStore, appRegistry, useAppStore, i18n utils
 * [OUTPUT]: CommandPalette 组件
 * [POS]: 统一搜索浮层，搜索应用 + 书签，被 AppManager 挂载，⌘K / Shift+F / 双击桌面触发
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Command } from "cmdk";
import { useEffect, useRef, useState } from "react";
import { useBookmarkStore, isFolder, getBookmarkIconInfo, openBookmarkUrl, type Bookmark } from "@/stores/useBookmarkStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useAppStore } from "@/stores/useAppStore";
import { appRegistry, getAppIconPath } from "@/config/appRegistry";
import type { AppId } from "@/config/appRegistry";
import { getTranslatedAppName } from "@/utils/i18n";
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

// ─── Component ───────────────────────────────────────────────────────────────

export function CommandPalette({ isOpen, onOpenChange }: CommandPaletteProps) {
  const { t } = useTranslation();
  const { items } = useBookmarkStore();
  const currentTheme = useThemeStore((s) => s.current);
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  // 应用列表
  const appList = Object.entries(appRegistry).map(([id, app]) => ({
    id: id as AppId,
    name: getTranslatedAppName(id as AppId),
    icon: getAppIconPath(id as AppId),
    rawName: app.name,
  }));

  // 展平所有书签（包括文件夹内的）
  const allBookmarks: FlatBookmark[] = items.flatMap((item) =>
    isFolder(item)
      ? item.bookmarks.map((bm) => ({ ...bm, folderTitle: item.title }))
      : [item]
  );

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
              onValueChange={setSearch}
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

            {/* 应用组 */}
            <Command.Group heading={t("common.search.appsGroup", "应用")}>
              {appList.map((app) => (
                <Command.Item
                  key={app.id}
                  value={`${app.name} ${app.rawName}`}
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
              {appList.length} {t("common.search.appsGroup", "应用")} · {allBookmarks.length} {t("common.search.bookmarksGroup", "书签")}
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
