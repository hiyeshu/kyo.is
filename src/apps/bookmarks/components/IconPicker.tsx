/**
 * [INPUT]: 依赖 @/components/ui, @/stores/useBookmarkStore
 * [OUTPUT]: IconPicker 组件
 * [POS]: 书签图标选择器，三种模式：网站图标 / 自定义上传 / Emoji
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Globe, UploadSimple, Smiley } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { type IconType, type BookmarkIcon, getFaviconUrl } from "@/stores/useBookmarkStore";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";

// ─── Emoji 精选（8x10 = 80 个） ─────────────────────────────────────────────────

const EMOJI_GRID = [
  ["💻", "🖥️", "📱", "⌨️", "🖱️", "💾", "📁", "📂"],
  ["🌐", "🔗", "📧", "💬", "🔔", "☁️", "🔒", "🔑"],
  ["🎵", "🎬", "📷", "🎨", "🎮", "📺", "🎧", "🎤"],
  ["💰", "📊", "📈", "💳", "🏦", "💼", "📋", "📌"],
  ["👤", "👥", "❤️", "⭐", "🔥", "👍", "🎉", "💡"],
  ["📚", "📖", "🎓", "✍️", "🔬", "📐", "🗺️", "🌍"],
  ["🏠", "☕", "🍕", "🎁", "⏰", "📅", "✈️", "🚀"],
  ["✅", "❌", "⚠️", "ℹ️", "❓", "💯", "🔴", "🟢"],
  ["🐦", "🐙", "🦊", "🐼", "🦁", "🐸", "🦋", "🌸"],
  ["🎯", "🏆", "🎲", "🎪", "🎭", "🎨", "🎸", "🎺"],
];

// ─── Props ─────────────────────────────────────────────────────────────────

interface IconPickerProps {
  url: string;
  value?: BookmarkIcon;
  onChange: (icon: BookmarkIcon) => void;
}

// ─── 组件 ─────────────────────────────────────────────────────────────────────

export function IconPicker({ url, value, onChange }: IconPickerProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<IconType>(value?.type || "favicon");
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string>(
    value?.type === "emoji" ? value.value : "🌐"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 解析 domain
  const domain = (() => {
    try {
      const fullUrl = url.startsWith("http") ? url : `https://${url}`;
      return new URL(fullUrl).hostname;
    } catch {
      return "example.com";
    }
  })();

  const faviconUrl = getFaviconUrl(domain);

  // 加载已有的自定义图标
  useEffect(() => {
    if (value?.type === "custom" && value.value) {
      setCustomPreview(value.value);
    }
  }, [value]);

  // 切换 tab 时更新图标
  useEffect(() => {
    if (activeTab === "favicon") {
      onChange({ type: "favicon", value: faviconUrl });
    } else if (activeTab === "emoji") {
      onChange({ type: "emoji", value: selectedEmoji });
    }
  }, [activeTab, faviconUrl, selectedEmoji, onChange]);

  // 文件上传
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) return;
      if (file.size > 100 * 1024) {
        alert("Max 100KB");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setCustomPreview(base64);
        onChange({ type: "custom", value: base64 });
      };
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  // Emoji 选择
  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      setSelectedEmoji(emoji);
      onChange({ type: "emoji", value: emoji });
    },
    [onChange]
  );

  return (
    <div className="space-y-3">
      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as IconType)}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-3 h-8">
          <TabsTrigger value="favicon" className="text-xs gap-1.5 h-7">
            <Globe className="w-3.5 h-3.5" />
            {t("apps.bookmarks.iconPicker.auto", "自動")}
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs gap-1.5 h-7">
            <UploadSimple className="w-3.5 h-3.5" />
            {t("apps.bookmarks.iconPicker.upload", "上傳")}
          </TabsTrigger>
          <TabsTrigger value="emoji" className="text-xs gap-1.5 h-7">
            <Smiley className="w-3.5 h-3.5" />
            {t("apps.bookmarks.iconPicker.emoji", "表情符號")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className="h-[120px]">
        {/* Favicon */}
        {activeTab === "favicon" && (
          <div className="flex items-center gap-4 p-3 rounded-lg bg-black/[0.02] border border-black/5">
            <div className="w-12 h-12 rounded-lg bg-white shadow-sm flex items-center justify-center">
              <img
                src={faviconUrl}
                alt=""
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/icons/default/internet.png";
                }}
              />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-black/70">{t("apps.bookmarks.iconPicker.autoFetched", "自動取得")}</p>
              <p className="text-[10px] text-black/40 mt-0.5 truncate">{domain}</p>
            </div>
          </div>
        )}

        {/* Upload */}
        {activeTab === "custom" && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-3 rounded-lg bg-black/[0.02] border border-dashed border-black/10 
                       hover:border-black/20 hover:bg-black/[0.03] transition-colors
                       flex items-center gap-4 text-left"
          >
            {customPreview ? (
              <div className="w-12 h-12 rounded-lg bg-white shadow-sm flex items-center justify-center overflow-hidden">
                <img src={customPreview} alt="" className="w-10 h-10 object-contain" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-black/5 flex items-center justify-center">
                <UploadSimple className="w-5 h-5 text-black/30" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-xs font-medium text-black/70">
                {customPreview 
                  ? t("apps.bookmarks.iconPicker.changeImage", "更換圖片") 
                  : t("apps.bookmarks.iconPicker.chooseImage", "選擇圖片")}
              </p>
              <p className="text-[10px] text-black/40 mt-0.5">{t("apps.bookmarks.iconPicker.imageSizeLimit", "PNG, JPG 最大 100KB")}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </button>
        )}

        {/* Emoji */}
        {activeTab === "emoji" && (
          <div className="p-2 rounded-lg bg-black/[0.02] border border-black/5 h-full overflow-y-auto">
            <div className="grid grid-cols-8 gap-0.5">
              {EMOJI_GRID.flat().map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  onClick={() => handleEmojiSelect(emoji)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-md text-lg transition-all",
                    selectedEmoji === emoji
                      ? "bg-white shadow-sm ring-1 ring-black/10 scale-110"
                      : "hover:bg-white/60"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
