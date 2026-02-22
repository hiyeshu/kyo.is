/**
 * [INPUT]: 依赖 useHistoryStore, useBookmarkStore, useStickiesStore, AppProps, WindowFrame, i18n
 * [OUTPUT]: HistoryApp 组件 — 时间线历史记录窗口
 * [POS]: apps/history/components 的主组件，读取 useHistoryStore，首次打开时播种现有数据
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { useTranslation } from "react-i18next";
import { useHistoryStore, type HistoryEntry } from "@/stores/useHistoryStore";
import { useBookmarkStore, openBookmarkUrl } from "@/stores/useBookmarkStore";
import { useStickiesStore } from "@/stores/useStickiesStore";
import { CopySimple } from "@phosphor-icons/react";
import { toast } from "sonner";

const PAGE_SIZE = 50;

// ─── 时间分组 ──────────────────────────────────────────────────────────────

function getTimeGroup(ts: number, t: (key: string, fallback: string) => string): string {
  const now = new Date();
  const date = new Date(ts);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0 && now.getDate() === date.getDate()) return t("apps.history.today", "今天");
  if (diffDays <= 1 && now.getDate() - date.getDate() === 1) return t("apps.history.yesterday", "昨天");
  if (diffDays < 7) return t("apps.history.thisWeek", "本周");
  return t("apps.history.earlier", "更早");
}

function groupByTime(entries: HistoryEntry[], t: (key: string, fallback: string) => string) {
  const groups: { label: string; items: HistoryEntry[] }[] = [];
  const map = new Map<string, HistoryEntry[]>();

  for (const entry of entries) {
    const label = getTimeGroup(entry.createdAt, t);
    if (!map.has(label)) {
      map.set(label, []);
      groups.push({ label, items: map.get(label)! });
    }
    map.get(label)!.push(entry);
  }
  return groups;
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────

export function HistoryApp({
  isWindowOpen,
  onClose,
  isForeground,
  skipInitialSound,
  instanceId,
  onNavigateNext,
  onNavigatePrevious,
}: AppProps) {
  const { t } = useTranslation();
  const { entries, seed, seeded } = useHistoryStore();
  const bookmarks = useBookmarkStore((s) => s.items);
  const notes = useStickiesStore((s) => s.notes);

  const [filter, setFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const listRef = useRef<HTMLDivElement>(null);

  // 首次打开时播种现有数据
  useEffect(() => {
    if (seeded) return;
    const bmEntries = bookmarks.map((bm) => ({
      id: bm.id,
      type: "bookmark" as const,
      title: bm.title,
      url: bm.url,
      favicon: bm.favicon,
      tags: bm.tags,
      createdAt: new Date(bm.createdAt).getTime(),
    }));
    const noteEntries = notes
      .filter((n) => n.content.trim().length > 0)
      .map((n) => ({
        id: n.id,
        type: "note" as const,
        title: n.content.slice(0, 60),
        content: n.content,
        tags: n.tags,
        createdAt: n.createdAt,
      }));
    seed([...bmEntries, ...noteEntries]);
  }, [seeded, bookmarks, notes, seed]);

  // 搜索过滤
  const q = filter.trim().toLowerCase();
  const filtered = q
    ? entries.filter((e) => {
        const haystack = [e.title, e.url || "", e.content || "", e.tags.join(" ")]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
    : entries;

  // 分页：搜索时不限制，浏览时分页
  const displayed = q ? filtered : filtered.slice(0, visibleCount);
  const hasMore = !q && visibleCount < filtered.length;

  // 滚动加载更多
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setVisibleCount((c) => c + PAGE_SIZE);
    }
  }, [hasMore]);

  // 重置分页
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter]);

  const groups = groupByTime(displayed, t);

  if (!isWindowOpen) return null;

  return (
    <WindowFrame
      title={t("apps.history.title", "历史记录")}
      onClose={onClose}
      isForeground={isForeground}
      appId="history"
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
            placeholder={t("apps.history.search", "搜索历史...")}
            className="w-full px-2 py-1 text-[12px] bg-white/80 border border-black/15 rounded outline-none focus:border-blue-400"
            style={{ fontFamily: "var(--os-font-ui)" }}
          />
        </div>

        {/* 时间线列表 */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleScroll}
        >
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[12px] text-black/40">
              {t("apps.history.empty", "暂无记录")}
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <div
                  className="sticky top-0 px-3 py-1 text-[10px] text-black/50 bg-white/95 backdrop-blur-sm border-b border-black/5"
                  style={{ fontFamily: "var(--os-font-ui)" }}
                >
                  {group.label}
                </div>
                {group.items.map((entry) => (
                  <HistoryItem key={entry.id} entry={entry} />
                ))}
              </div>
            ))
          )}
        </div>

        {/* 底栏 */}
        <div className="px-3 py-1.5 border-t border-black/10 text-[10px] text-black/40 flex justify-between">
          <span>
            {displayed.length}{hasMore ? ` / ${filtered.length}` : ""} {t("apps.history.items", "项")}
          </span>
        </div>
      </div>
    </WindowFrame>
  );
}

// ─── 单条目 ──────────────────────────────────────────────────────────────────

function HistoryItem({ entry }: { entry: HistoryEntry }) {
  const isDeleted = !!entry.deletedAt;
  const [faviconBroken, setFaviconBroken] = useState(false);
  const time = new Date(entry.createdAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const copyText = entry.type === "bookmark" ? entry.url || "" : entry.content || entry.title;

  const handleClick = () => {
    if (entry.type === "bookmark" && entry.url) {
      openBookmarkUrl(entry.url);
    } else if (entry.content) {
      navigator.clipboard.writeText(entry.content);
      toast.success("已复制");
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(copyText);
    toast.success("已复制");
  };

  return (
    <button
      className={`group w-full flex items-center gap-3 px-3 py-2 hover:bg-black/5 text-left cursor-pointer ${
        isDeleted ? "opacity-50" : ""
      }`}
      onClick={handleClick}
    >
      {entry.type === "bookmark" && entry.favicon && !faviconBroken ? (
        <img
          src={entry.favicon}
          alt=""
          className="w-4 h-4 shrink-0 object-contain"
          style={{ borderRadius: "3px" }}
          onError={() => setFaviconBroken(true)}
        />
      ) : (
        <span className="text-sm shrink-0">
          {entry.type === "bookmark" ? "🔖" : "📝"}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div
          className="text-[12px] truncate"
          style={{ fontFamily: "var(--os-font-ui)" }}
        >
          {entry.title}
        </div>
        {entry.type === "bookmark" && entry.url && (
          <div className="text-[10px] text-black/40 truncate">{entry.url}</div>
        )}
        {entry.type === "note" && entry.content && entry.content !== entry.title && (
          <div className="text-[10px] text-black/40 truncate">
            {entry.content.slice(0, 80)}
          </div>
        )}
      </div>
      <button
        type="button"
        className="shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-0.5 cursor-pointer"
        onClick={handleCopy}
      >
        <CopySimple className="w-3.5 h-3.5 text-black/50" />
      </button>
      <span className="text-[10px] text-black/30 shrink-0">{time}</span>
    </button>
  );
}
