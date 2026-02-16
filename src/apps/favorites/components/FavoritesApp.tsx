/**
 * [INPUT]: 依赖 useKyoItems, AppProps, WindowFrame, i18n
 * [OUTPUT]: FavoritesApp 组件 — 收藏夹窗口，混排书签+便签
 * [POS]: apps/favorites/components 的主组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { useTranslation } from "react-i18next";
import { useKyoItems } from "@/stores/useKyoItemStore";
import { openBookmarkUrl } from "@/stores/useBookmarkStore";
import type { KyoItem } from "@/types/kyoItem";

export function FavoritesApp({
  isWindowOpen,
  onClose,
  isForeground,
  skipInitialSound,
  instanceId,
  onNavigateNext,
  onNavigatePrevious,
}: AppProps) {
  const { t } = useTranslation();
  const allItems = useKyoItems();
  const [filter, setFilter] = useState("");

  const filtered = filter
    ? allItems.filter((item) => {
        const q = filter.toLowerCase();
        if (item.type === "bookmark") {
          return (
            item.title.toLowerCase().includes(q) ||
            item.url.toLowerCase().includes(q) ||
            item.tags.some((tag) => tag.toLowerCase().includes(q))
          );
        }
        return (
          item.content.toLowerCase().includes(q) ||
          item.tags.some((tag) => tag.toLowerCase().includes(q))
        );
      })
    : allItems;

  if (!isWindowOpen) return null;

  return (
    <WindowFrame
      title={t("apps.favorites.title", "收藏夹")}
      onClose={onClose}
      isForeground={isForeground}
      appId="favorites"
      skipInitialSound={skipInitialSound}
      instanceId={instanceId}
      onNavigateNext={onNavigateNext}
      onNavigatePrevious={onNavigatePrevious}
    >
      <div className="flex flex-col h-full w-full bg-white/90">
        {/* 搜索栏 */}
        <div className="px-3 py-2 border-b border-black/10">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("apps.favorites.search", "搜索收藏...")}
            className="w-full px-2 py-1 text-[12px] bg-white/80 border border-black/15 rounded outline-none focus:border-blue-400"
            style={{ fontFamily: "var(--os-font-ui)" }}
          />
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[12px] text-black/40">
              {t("apps.favorites.empty", "暂无收藏")}
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {filtered.map((item) => (
                <FavoritesItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* 底栏 */}
        <div className="px-3 py-1.5 border-t border-black/10 text-[10px] text-black/40">
          {filtered.length} {t("apps.favorites.items", "项")}
        </div>
      </div>
    </WindowFrame>
  );
}

// ─── 单条目 ──────────────────────────────────────────────────────────────────

function FavoritesItem({ item }: { item: KyoItem }) {
  const date = new Date(item.createdAt).toLocaleDateString();

  if (item.type === "bookmark") {
    return (
      <button
        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-black/5 text-left"
        onClick={() => openBookmarkUrl(item.url)}
      >
        <span className="text-sm shrink-0">🔖</span>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] truncate" style={{ fontFamily: "var(--os-font-ui)" }}>
            {item.title}
          </div>
          <div className="text-[10px] text-black/40 truncate">{item.url}</div>
        </div>
        <span className="text-[10px] text-black/30 shrink-0">{date}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 hover:bg-black/5">
      <span className="text-sm shrink-0">📝</span>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] truncate" style={{ fontFamily: "var(--os-font-ui)" }}>
          {item.content.slice(0, 80) || "空便签"}
        </div>
        {item.tags.length > 0 && (
          <div className="text-[10px] text-black/40 truncate">
            {item.tags.join(", ")}
          </div>
        )}
      </div>
      <span className="text-[10px] text-black/30 shrink-0">{date}</span>
    </div>
  );
}
