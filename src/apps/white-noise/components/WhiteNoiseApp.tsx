/**
 * [INPUT]: 依赖 AppProps, WindowFrame, Web Audio API
 * [OUTPUT]: WhiteNoiseApp 组件 — 白噪音播放器
 * [POS]: apps/white-noise/components 的主组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useCallback } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { useTranslation } from "react-i18next";

interface SoundOption {
  id: string;
  emoji: string;
  labelKey: string;
  fallback: string;
  src: string;
}

const SOUNDS: SoundOption[] = [
  { id: "rain", emoji: "🌧️", labelKey: "apps.whiteNoise.rain", fallback: "雨声", src: "/sounds/ambient/rain.mp3" },
  { id: "ocean", emoji: "🌊", labelKey: "apps.whiteNoise.ocean", fallback: "海浪", src: "/sounds/ambient/ocean.mp3" },
  { id: "forest", emoji: "🌲", labelKey: "apps.whiteNoise.forest", fallback: "森林", src: "/sounds/ambient/forest.mp3" },
  { id: "fire", emoji: "🔥", labelKey: "apps.whiteNoise.fire", fallback: "篝火", src: "/sounds/ambient/fire.mp3" },
  { id: "wind", emoji: "💨", labelKey: "apps.whiteNoise.wind", fallback: "风声", src: "/sounds/ambient/wind.mp3" },
];

export function WhiteNoiseApp({
  isWindowOpen,
  onClose,
  isForeground,
  skipInitialSound,
  instanceId,
  onNavigateNext,
  onNavigatePrevious,
}: AppProps) {
  const { t } = useTranslation();
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback((sound: SoundOption) => {
    // 停止当前播放
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (activeSound === sound.id) {
      setActiveSound(null);
      return;
    }

    const audio = new Audio(sound.src);
    audio.loop = true;
    audio.volume = volume;
    audio.play().catch(() => {});
    audioRef.current = audio;
    setActiveSound(sound.id);
  }, [activeSound, volume]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) {
      audioRef.current.volume = v;
    }
  }, []);

  // 窗口关闭时停止播放
  if (!isWindowOpen) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    return null;
  }

  return (
    <WindowFrame
      title={t("apps.whiteNoise.title", "白噪音")}
      onClose={() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        setActiveSound(null);
        onClose();
      }}
      isForeground={isForeground}
      appId="white-noise"
      skipInitialSound={skipInitialSound}
      instanceId={instanceId}
      onNavigateNext={onNavigateNext}
      onNavigatePrevious={onNavigatePrevious}
    >
      <div className="flex flex-col h-full w-full bg-white/90 p-4 gap-4">
        {/* 声音选择网格 */}
        <div className="grid grid-cols-5 gap-3">
          {SOUNDS.map((sound) => (
            <button
              key={sound.id}
              onClick={() => playSound(sound)}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                activeSound === sound.id
                  ? "bg-blue-100 ring-2 ring-blue-400"
                  : "hover:bg-black/5"
              }`}
            >
              <span className="text-2xl">{sound.emoji}</span>
              <span className="text-[10px]" style={{ fontFamily: "var(--os-font-ui)" }}>
                {t(sound.labelKey, sound.fallback)}
              </span>
            </button>
          ))}
        </div>

        {/* 音量控制 */}
        <div className="flex items-center gap-3 px-1">
          <span className="text-sm">🔈</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 h-1 accent-blue-500"
          />
          <span className="text-sm">🔊</span>
        </div>

        {/* 状态 */}
        <div className="text-center text-[11px] text-black/40" style={{ fontFamily: "var(--os-font-ui)" }}>
          {activeSound
            ? t("apps.whiteNoise.playing", "正在播放...")
            : t("apps.whiteNoise.selectSound", "选择一个声音开始")}
        </div>
      </div>
    </WindowFrame>
  );
}
