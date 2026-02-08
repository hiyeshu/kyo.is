/**
 * [INPUT]: useWallpaper, useDisplaySettingsStore, useSound, wallpapers manifest
 * [OUTPUT]: WallpaperPicker 组件
 * [POS]: 壁纸选择器，支持 tiles/photos/videos/custom 分类
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
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
  isTile?: boolean;
  isVideo?: boolean;
  previewUrl?: string;
}

function WallpaperItem({
  path,
  isSelected,
  onClick,
  isTile = false,
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
      className={`preview-button w-full ${
        isTile ? "aspect-square" : "aspect-video"
      } cursor-pointer hover:opacity-90`}
      style={{
        backgroundImage: `url(${displayUrl})`,
        backgroundSize: isTile ? "64px 64px" : "cover",
        backgroundPosition: isTile ? undefined : "center",
        backgroundRepeat: isTile ? "repeat" : undefined,
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

type PhotoCategory = string;

interface WallpaperPickerProps {
  onSelect?: (path: string) => void;
}

export function WallpaperPicker({ onSelect }: WallpaperPickerProps) {
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

  // Load manifest
  const [manifest, setManifest] = useState<WallpaperManifest | null>(null);
  useEffect(() => {
    loadWallpaperManifest().then(setManifest).catch(console.error);
  }, []);

  // Derived wallpaper lists
  const tileWallpapers = useMemo(
    () => (manifest ? manifest.tiles.map((p) => `/wallpapers/${p}`) : []),
    [manifest]
  );
  const videoWallpapers = useMemo(
    () => (manifest ? manifest.videos.map((p) => `/wallpapers/${p}`) : []),
    [manifest]
  );
  const photoWallpapers = useMemo(() => {
    if (!manifest) return {} as Record<string, string[]>;
    const r: Record<string, string[]> = {};
    for (const [cat, arr] of Object.entries(manifest.photos)) {
      r[cat] = arr.map((p) => `/wallpapers/${p}`);
    }
    return r;
  }, [manifest]);
  const photoCategoriesSorted = useMemo(
    () =>
      Object.keys(photoWallpapers)
        .filter((cat) => cat !== "custom" && cat !== "videos")
        .sort((a, b) => a.localeCompare(b)),
    [photoWallpapers]
  );

  // Selected category
  const [selectedCategory, setSelectedCategory] = useState<
    "tiles" | "videos" | "custom" | PhotoCategory
  >(() => {
    if (currentWallpaper.includes("/wallpapers/tiles/")) return "tiles";
    if (currentWallpaper.startsWith(INDEXEDDB_PREFIX)) return "custom";
    if (currentWallpaper.includes("/wallpapers/videos/")) return "videos";
    const match = currentWallpaper.match(/\/wallpapers\/photos\/([^/]+)\//);
    if (match) return match[1];
    return "tiles";
  });

  // Load custom wallpapers
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
        const previews = Object.fromEntries(
          entries.filter((e): e is [string, string] => e !== null)
        );
        setCustomWallpaperPreviews(previews);
      } catch (e) {
        console.error("Error loading custom wallpapers:", e);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [loadCustomWallpapers, getWallpaperData, INDEXEDDB_PREFIX]);

  // Sync category with wallpaper
  useEffect(() => {
    if (currentWallpaper.includes("/wallpapers/tiles/")) {
      setSelectedCategory("tiles");
    } else if (currentWallpaper.startsWith(INDEXEDDB_PREFIX)) {
      setSelectedCategory("custom");
    } else if (currentWallpaper.includes("/wallpapers/videos/")) {
      setSelectedCategory("videos");
    } else {
      const match = currentWallpaper.match(/\/wallpapers\/photos\/([^/]+)\//);
      if (match) setSelectedCategory(match[1]);
    }
  }, [currentWallpaper, INDEXEDDB_PREFIX]);

  const handleWallpaperSelect = (path: string) => {
    setWallpaper(path);
    playClick();
    onSelect?.(path);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
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
      const previews = Object.fromEntries(
        entries.filter((entry): entry is [string, string] => entry !== null)
      );
      setCustomWallpaperPreviews(previews);
      setSelectedCategory("custom");
    } catch (error) {
      console.error("Error uploading wallpaper:", error);
      alert("Error uploading wallpaper.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatCategoryLabel = (category: string) =>
    category
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const isVideoWallpaper = (path: string, previewUrl?: string) => {
    const url = previewUrl || path;
    return (
      url.endsWith(".mp4") ||
      url.includes("video/") ||
      (url.startsWith("https://") && /\.(mp4|webm|ogg)($|\?)/.test(url))
    );
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      {/* Category & Display Mode Selectors */}
      <div className="flex items-center gap-2">
        <div className="flex-[3]">
          <Select
            value={selectedCategory}
            onValueChange={(v) => setSelectedCategory(v as typeof selectedCategory)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="videos">Videos</SelectItem>
              <SelectItem value="tiles">Patterns</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
              <SelectSeparator
                className="-mx-1 my-1 h-px"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.15)",
                  border: "none",
                }}
              />
              {photoCategoriesSorted.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {formatCategoryLabel(cat)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Select
          value={displayMode}
          onValueChange={(v) => setDisplayMode(v as DisplayMode)}
        >
          <SelectTrigger className="w-[120px] flex-shrink-0">
            <SelectValue placeholder="Display Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="color">Color</SelectItem>
            <SelectItem value="monotone">Mono</SelectItem>
            <SelectItem value="crt">CRT</SelectItem>
            <SelectItem value="sepia">Sepia</SelectItem>
            <SelectItem value="high-contrast">High Contrast</SelectItem>
            <SelectItem value="dream">Dream</SelectItem>
            <SelectItem value="invert">Invert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Hidden file input for custom wallpapers */}
      {selectedCategory === "custom" && (
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      )}

      {/* Wallpaper Grid */}
      <div className="flex-1">
        <div
          className={`grid gap-2 py-1 ${
            selectedCategory === "tiles" ? "grid-cols-8" : "grid-cols-3"
          }`}
        >
          {selectedCategory === "tiles" ? (
            tileWallpapers.map((path) => (
              <WallpaperItem
                key={path}
                path={path}
                isSelected={currentWallpaper === path}
                onClick={() => handleWallpaperSelect(path)}
                isTile
              />
            ))
          ) : selectedCategory === "videos" ? (
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
          ) : photoWallpapers[selectedCategory] ? (
            photoWallpapers[selectedCategory].map((path) => (
              <WallpaperItem
                key={path}
                path={path}
                isSelected={currentWallpaper === path}
                onClick={() => handleWallpaperSelect(path)}
              />
            ))
          ) : (
            <div className="col-span-4 text-center py-8 text-gray-500">
              No wallpapers
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
