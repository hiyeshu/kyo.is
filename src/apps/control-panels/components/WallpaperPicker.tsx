/**
 * [INPUT]: useWallpaper, useDisplaySettingsStore, useSound, wallpapers manifest, i18next
 * [OUTPUT]: WallpaperPicker 组件
 * [POS]: 壁纸选择器，三分类：视频 / 预设 / 自定义
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWallpaper } from "@/hooks/useWallpaper";
import { useSound, Sounds } from "@/hooks/useSound";
import type { DisplayMode } from "@/utils/displayMode";
import { Plus } from "@phosphor-icons/react";
import { useDisplaySettingsStore } from "@/stores/useDisplaySettingsStore";
import { loadWallpaperManifest } from "@/utils/wallpapers";
import type { WallpaperManifest } from "@/utils/wallpapers";

// ═══════════════════════════════════════════════════════════════════════════════
// Wallpaper Item
// ═══════════════════════════════════════════════════════════════════════════════

interface WallpaperItemProps {
  path: string;
  isSelected: boolean;
  onClick: () => void;
  isVideo?: boolean;
  previewUrl?: string;
}

function WallpaperItem({
  path,
  isSelected,
  onClick,
  isVideo = false,
  previewUrl,
}: WallpaperItemProps) {
  const { play: playClick } = useSound(Sounds.BUTTON_CLICK, 0.3);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(isVideo);
  const displayUrl = previewUrl || path;

  const handleClick = () => {
    playClick();
    onClick();
  };

  useEffect(() => {
    if (isVideo && videoRef.current) {
      if (isSelected) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
      if (videoRef.current.readyState >= 3) {
        setIsLoading(false);
      }
    }
  }, [isSelected, isVideo]);

  if (isVideo) {
    return (
      <button
        type="button"
        className="preview-button w-full aspect-video cursor-pointer hover:opacity-90 relative overflow-hidden"
        style={{
          boxShadow: isSelected
            ? "0 0 0 1px #fff, 0 0 0 3px var(--os-color-selection-bg)"
            : undefined,
        }}
        onClick={handleClick}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-gray-700/30">
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50"
              style={{
                backgroundSize: "200% 100%",
                animation: "shimmer 2.5s infinite ease-in-out",
              }}
            />
          </div>
        )}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          src={displayUrl}
          loop
          muted
          playsInline
          onLoadedData={() => setIsLoading(false)}
          onCanPlayThrough={() => setIsLoading(false)}
          style={{
            opacity: isLoading ? 0 : 1,
            transition: "opacity 0.5s ease-in-out",
          }}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="preview-button w-full aspect-video cursor-pointer hover:opacity-90"
      style={{
        backgroundImage: `url(${displayUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        boxShadow: isSelected
          ? "0 0 0 1px #fff, 0 0 0 3px var(--os-color-selection-bg)"
          : undefined,
      }}
      onClick={handleClick}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Wallpaper Picker
// ═══════════════════════════════════════════════════════════════════════════════

type Category = "videos" | "presets" | "custom";

interface WallpaperPickerProps {
  onSelect?: (path: string) => void;
}

export function WallpaperPicker({ onSelect }: WallpaperPickerProps) {
  const { t } = useTranslation();
  const {
    currentWallpaper,
    setWallpaper,
    INDEXEDDB_PREFIX,
    loadCustomWallpapers,
    getWallpaperData,
  } = useWallpaper();

  const { play: playClick } = useSound(Sounds.BUTTON_CLICK, 0.3);
  const displayMode = useDisplaySettingsStore((s) => s.displayMode);
  const setDisplayMode = useDisplaySettingsStore((s) => s.setDisplayMode);
  const [customWallpaperRefs, setCustomWallpaperRefs] = useState<string[]>([]);
  const [customWallpaperPreviews, setCustomWallpaperPreviews] = useState<
    Record<string, string>
  >({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Manifest ──────────────────────────────────────────────────────────────

  const [manifest, setManifest] = useState<WallpaperManifest | null>(null);
  useEffect(() => {
    loadWallpaperManifest().then(setManifest).catch(console.error);
  }, []);

  const videoWallpapers = useMemo(
    () => (manifest ? manifest.videos.map((p) => `/wallpapers/${p}`) : []),
    [manifest]
  );

  const presetWallpapers = useMemo(() => {
    if (!manifest) return [];
    return Object.values(manifest.photos)
      .flat()
      .map((p) => `/wallpapers/${p}`);
  }, [manifest]);

  // ─── Category ──────────────────────────────────────────────────────────────

  const [selectedCategory, setSelectedCategory] = useState<Category>(() => {
    if (currentWallpaper.startsWith(INDEXEDDB_PREFIX)) return "custom";
    if (currentWallpaper.includes("/wallpapers/videos/")) return "videos";
    return "presets";
  });

  useEffect(() => {
    if (currentWallpaper.startsWith(INDEXEDDB_PREFIX)) {
      setSelectedCategory("custom");
    } else if (currentWallpaper.includes("/wallpapers/videos/")) {
      setSelectedCategory("videos");
    } else {
      setSelectedCategory("presets");
    }
  }, [currentWallpaper, INDEXEDDB_PREFIX]);

  // ─── Custom wallpapers ────────────────────────────────────────────────────

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const refs = await loadCustomWallpapers();
        if (!active) return;
        setCustomWallpaperRefs(refs);

        const entries = await Promise.all(
          refs.map(async (ref) => {
            const data = await getWallpaperData(ref);
            return data ? ([ref, data] as const) : null;
          })
        );
        if (!active) return;
        setCustomWallpaperPreviews(
          Object.fromEntries(
            entries.filter((e): e is [string, string] => e !== null)
          )
        );
      } catch (e) {
        console.error("Error loading custom wallpapers:", e);
      }
    };
    load();
    return () => { active = false; };
  }, [loadCustomWallpapers, getWallpaperData, INDEXEDDB_PREFIX]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleWallpaperSelect = (path: string) => {
    setWallpaper(path);
    playClick();
    onSelect?.(path);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    try {
      await setWallpaper(file);
      const refs = await loadCustomWallpapers();
      setCustomWallpaperRefs(refs);
      const entries = await Promise.all(
        refs.map(async (ref) => {
          const data = await getWallpaperData(ref);
          return data ? ([ref, data] as const) : null;
        })
      );
      setCustomWallpaperPreviews(
        Object.fromEntries(
          entries.filter((entry): entry is [string, string] => entry !== null)
        )
      );
      setSelectedCategory("custom");
    } catch (error) {
      console.error("Error uploading wallpaper:", error);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isVideoWallpaper = (path: string, previewUrl?: string) => {
    const url = previewUrl || path;
    return (
      url.endsWith(".mp4") ||
      url.includes("video/") ||
      (url.startsWith("https://") && /\.(mp4|webm|ogg)($|\?)/.test(url))
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 flex flex-col h-full">
      <div className="flex items-center gap-2">
        <div className="flex-[3]">
          <Select
            value={selectedCategory}
            onValueChange={(v) => setSelectedCategory(v as Category)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="videos">{t("apps.control-panels.videos", "视频")}</SelectItem>
              <SelectItem value="presets">{t("apps.control-panels.default", "预设")}</SelectItem>
              <SelectItem value="custom">{t("apps.control-panels.custom", "自定义")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select
          value={displayMode}
          onValueChange={(v) => setDisplayMode(v as DisplayMode)}
        >
          <SelectTrigger className="w-[120px] flex-shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="color">{t("apps.control-panels.color", "彩色")}</SelectItem>
            <SelectItem value="monotone">{t("apps.control-panels.mono", "黑白")}</SelectItem>
            <SelectItem value="crt">CRT</SelectItem>
            <SelectItem value="sepia">{t("apps.control-panels.sepia", "复古")}</SelectItem>
            <SelectItem value="high-contrast">{t("apps.control-panels.highContrast", "高对比")}</SelectItem>
            <SelectItem value="dream">{t("apps.control-panels.dream", "梦幻")}</SelectItem>
            <SelectItem value="invert">{t("apps.control-panels.invert", "反转")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedCategory === "custom" && (
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      )}

      <div className="flex-1">
        <div className="grid gap-2 py-1 grid-cols-3">
          {selectedCategory === "videos" ? (
            videoWallpapers.map((path) => (
              <WallpaperItem
                key={path}
                path={path}
                isSelected={currentWallpaper === path}
                onClick={() => handleWallpaperSelect(path)}
                isVideo
              />
            ))
          ) : selectedCategory === "custom" ? (
            <>
              <button
                type="button"
                className="preview-button w-full aspect-video !border-[2px] !border-dotted !border-gray-400 cursor-pointer hover:opacity-90 flex items-center justify-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="h-5 w-5 text-gray-500" weight="bold" />
              </button>
              {customWallpaperRefs.map((path) => (
                <WallpaperItem
                  key={path}
                  path={path}
                  previewUrl={customWallpaperPreviews[path]}
                  isSelected={currentWallpaper === path}
                  onClick={() => handleWallpaperSelect(path)}
                  isVideo={isVideoWallpaper(path, customWallpaperPreviews[path])}
                />
              ))}
            </>
          ) : (
            presetWallpapers.map((path) => (
              <WallpaperItem
                key={path}
                path={path}
                isSelected={currentWallpaper === path}
                onClick={() => handleWallpaperSelect(path)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
