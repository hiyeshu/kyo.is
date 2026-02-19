/**
 * [INPUT]: 依赖 AppProps, WindowFrame, useThemeStore, Web Audio API (AnalyserNode)
 * [OUTPUT]: WhiteNoiseApp 组件 — 主题适配的复古收音机，实时音频频谱可视化
 * [POS]: apps/white-noise/components 的主组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { useThemeStore } from "@/stores/useThemeStore";
import { useTranslation } from "react-i18next";

/* ═══════════════════════════════════════════════════════════════════════════════
 * 三段式布局：格栅 + 显示屏 + 控制面板
 * 致敬 Braun SK4、Sony TR-610、Tivoli Audio
 * ═══════════════════════════════════════════════════════════════════════════════ */

interface SoundOption {
  id: string;
  labelKey: string;
  fallback: string;
  src: string;
}

const BASE_SOUND_PATH = `${import.meta.env.BASE_URL}sounds/ambient/`;

const SOUNDS: SoundOption[] = [
  { id: "rain", labelKey: "apps.whiteNoise.rain", fallback: "Rain", src: `${BASE_SOUND_PATH}rain.mp3` },
  { id: "ocean", labelKey: "apps.whiteNoise.ocean", fallback: "Ocean", src: `${BASE_SOUND_PATH}ocean.mp3` },
  { id: "forest", labelKey: "apps.whiteNoise.forest", fallback: "Forest", src: `${BASE_SOUND_PATH}forest.mp3` },
  { id: "fire", labelKey: "apps.whiteNoise.fire", fallback: "Fire", src: `${BASE_SOUND_PATH}fire.mp3` },
  { id: "wind", labelKey: "apps.whiteNoise.wind", fallback: "Wind", src: `${BASE_SOUND_PATH}wind.mp3` },
];

/* ═══════════════════════════════════════════════════════════════════════════════
 * 主题色彩系统
 * ═══════════════════════════════════════════════════════════════════════════════ */
interface RadioTheme {
  // 主体
  body: string;
  panel: string;
  panelBorder: string;
  // 格栅
  grilleBg: string;
  grilleDark: string;
  grilleLight: string;
  // 显示屏
  screenBg: string;
  screenBorder: string;
  // 按钮
  buttonBg: string;
  buttonActiveBg: string;
  buttonBorder: string;
  buttonText: string;
  buttonActiveText: string;
  buttonShadow: string;
  buttonActiveShadow: string;
  // 旋钮
  dialBase: string;
  dialBody: string;
  dialIndicator: string;
  dialShadow: string;
  // 文字
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // 屏幕显示
  displayText: string;
  displayTextDim: string;
  displayGlow: string;
  // 指示灯
  indicator: string;
  // 字体
  fontFamily: string;
  fontWeight: number;
  displayFont: string;
  // 圆角
  borderRadius: string;
  buttonRadius: string;
}

const THEMES: Record<string, RadioTheme> = {
  /* ─────────────────────────────────────────────────────────────────────────────
   * macOS Aqua: Braun SK4 风格 - 迪特·拉姆斯
   * ───────────────────────────────────────────────────────────────────────────── */
  macosx: {
    body: "#F5F5F0",
    panel: "#E8E4DC",
    panelBorder: "#D4D0C8",
    grilleBg: "#3D3D3D",
    grilleDark: "#2D2D2D",
    grilleLight: "#4D4D4D",
    screenBg: "#1C1C1C",
    screenBorder: "#0C0C0C",
    buttonBg: "#F5F5F0",
    buttonActiveBg: "#2D2D2D",
    buttonBorder: "#D4D0C8",
    buttonText: "#2D2D2D",
    buttonActiveText: "#F5F5F0",
    buttonShadow: "0 1px 2px rgba(0,0,0,0.1)",
    buttonActiveShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
    dialBase: "linear-gradient(145deg, #FFFFFF, #A8A4A0)",
    dialBody: "linear-gradient(145deg, #C8C4BC, #E8E4DC)",
    dialIndicator: "#E85D04",
    dialShadow: "0 2px 4px rgba(0,0,0,0.2)",
    textPrimary: "#2D2D2D",
    textSecondary: "#6B6B6B",
    textMuted: "#9A9A9A",
    displayText: "#E85D04",
    displayTextDim: "rgba(232, 93, 4, 0.25)",
    displayGlow: "0 0 8px rgba(232, 93, 4, 0.4)",
    indicator: "#E85D04",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    fontWeight: 300,
    displayFont: "'Helvetica Neue', Helvetica, monospace",
    borderRadius: "3px",
    buttonRadius: "2px",
  },

  /* ─────────────────────────────────────────────────────────────────────────────
   * Windows XP: Media Player 风格 - Luna 蓝金属质感
   * ───────────────────────────────────────────────────────────────────────────── */
  xp: {
    body: "linear-gradient(180deg, #4A7CC9 0%, #2952A3 100%)",
    panel: "linear-gradient(180deg, #ECE9D8 0%, #D4D0C4 100%)",
    panelBorder: "#808080",
    grilleBg: "#1E3A5F",
    grilleDark: "#162D4D",
    grilleLight: "#2A4A70",
    screenBg: "#0a1420",
    screenBorder: "#003C74",
    buttonBg: "linear-gradient(180deg, #FFFFFF 0%, #ECE9D8 50%, #D4D0C4 100%)",
    buttonActiveBg: "linear-gradient(180deg, #316AC5 0%, #1E4A8D 100%)",
    buttonBorder: "#003C74",
    buttonText: "#000000",
    buttonActiveText: "#FFFFFF",
    buttonShadow: "inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf",
    buttonActiveShadow: "inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey",
    dialBase: "linear-gradient(145deg, #ECE9D8, #A09D94)",
    dialBody: "linear-gradient(145deg, #D4D0C4, #FFFFFF)",
    dialIndicator: "#316AC5",
    dialShadow: "0 2px 4px rgba(0,0,0,0.3)",
    textPrimary: "#000000",
    textSecondary: "#5A5A5A",
    textMuted: "#808080",
    displayText: "#33FF33",
    displayTextDim: "rgba(51, 255, 51, 0.15)",
    displayGlow: "0 0 6px rgba(51, 255, 51, 0.5)",
    indicator: "#90EE90",
    fontFamily: "Tahoma, 'MS Sans Serif', sans-serif",
    fontWeight: 400,
    displayFont: "'Consolas', 'Courier New', monospace",
    borderRadius: "0px",
    buttonRadius: "3px",
  },

  /* ─────────────────────────────────────────────────────────────────────────────
   * Windows 98: 经典 3D 凸起风格 - 像素感
   * ───────────────────────────────────────────────────────────────────────────── */
  win98: {
    body: "#C0C0C0",
    panel: "#C0C0C0",
    panelBorder: "#808080",
    grilleBg: "#404040",
    grilleDark: "#202020",
    grilleLight: "#505050",
    screenBg: "#000000",
    screenBorder: "#808080",
    buttonBg: "#C0C0C0",
    buttonActiveBg: "#000080",
    buttonBorder: "#808080",
    buttonText: "#000000",
    buttonActiveText: "#FFFFFF",
    buttonShadow: "inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px grey, inset 2px 2px #dfdfdf",
    buttonActiveShadow: "inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px grey",
    dialBase: "#C0C0C0",
    dialBody: "linear-gradient(145deg, #DFDFDF, #A0A0A0)",
    dialIndicator: "#000080",
    dialShadow: "inset -1px -1px #fff, inset 1px 1px #0a0a0a",
    textPrimary: "#000000",
    textSecondary: "#404040",
    textMuted: "#808080",
    displayText: "#00FF00",
    displayTextDim: "rgba(0, 255, 0, 0.12)",
    displayGlow: "none",
    indicator: "#00FF00",
    fontFamily: "'MS Sans Serif', Tahoma, sans-serif",
    fontWeight: 400,
    displayFont: "'Fixedsys', 'Courier New', monospace",
    borderRadius: "0px",
    buttonRadius: "0px",
  },
};



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
  const currentTheme = useThemeStore((state) => state.current);
  
  const theme = useMemo(() => {
    if (currentTheme === "xp") return THEMES.xp;
    if (currentTheme === "win98") return THEMES.win98;
    return THEMES.macosx;
  }, [currentTheme]);
  
  const isClassicTheme = currentTheme === "xp" || currentTheme === "win98";
  
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [dialRotation, setDialRotation] = useState(-135 + (0.5 * 270));
  const [frequencies, setFrequencies] = useState<number[]>(Array(8).fill(0));
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dialRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastSoundRef = useRef<SoundOption>(SOUNDS[0]);
  
  // 音频分析
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const activeSoundName = useMemo(() => {
    if (!activeSound) return null;
    const sound = SOUNDS.find(s => s.id === activeSound);
    return sound ? t(sound.labelKey, sound.fallback) : null;
  }, [activeSound, t]);

  // 停止频谱分析
  const stopAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setFrequencies(Array(8).fill(0));
  }, []);

  // 开始频谱分析
  const startAnalysis = useCallback((audio: HTMLAudioElement) => {
    // 创建或复用 AudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;
    
    // 创建 Analyser
    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 64; // 小 FFT 用于简洁波形
      analyserRef.current.smoothingTimeConstant = 0.7;
    }
    
    // 连接音频源（只能连接一次）
    if (!sourceRef.current) {
      sourceRef.current = ctx.createMediaElementSource(audio);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);
    }
    
    // 频谱数据读取循环
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    const numBands = 8;
    
    const analyze = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // 将频谱数据映射到 8 个条
      const bands: number[] = [];
      const binCount = dataArray.length;
      const binsPerBand = Math.floor(binCount / numBands);
      
      for (let i = 0; i < numBands; i++) {
        let sum = 0;
        const start = i * binsPerBand;
        const end = start + binsPerBand;
        for (let j = start; j < end && j < binCount; j++) {
          sum += dataArray[j];
        }
        // 归一化到 0-1
        bands.push((sum / binsPerBand) / 255);
      }
      
      setFrequencies(bands);
      animationFrameRef.current = requestAnimationFrame(analyze);
    };
    
    analyze();
  }, []);

  const stopPlayback = useCallback(() => {
    stopAnalysis();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // 重置音频源（下次播放需要重新创建）
    sourceRef.current = null;
    setActiveSound(null);
  }, [stopAnalysis]);

  const playSound = useCallback((sound: SoundOption) => {
    stopPlayback();

    if (activeSound === sound.id) {
      return;
    }

    const audio = new Audio(sound.src);
    audio.loop = true;
    audio.volume = volume;
    audio.crossOrigin = "anonymous"; // 需要 CORS 才能分析音频
    audio.play().then(() => {
      startAnalysis(audio);
    }).catch(() => {});
    audioRef.current = audio;
    setActiveSound(sound.id);
    lastSoundRef.current = sound;
  }, [activeSound, startAnalysis, stopPlayback, volume]);

  const handleTogglePlayback = useCallback(() => {
    if (activeSound) {
      stopPlayback();
      return;
    }

    playSound(lastSoundRef.current ?? SOUNDS[0]);
  }, [activeSound, playSound, stopPlayback]);

  const handleDialInteraction = useCallback((clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    
    let normalizedAngle = angle + 90;
    if (normalizedAngle < -135) normalizedAngle = -135;
    if (normalizedAngle > 135) normalizedAngle = 135;
    
    const newVolume = (normalizedAngle + 135) / 270;
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    
    setVolume(clampedVolume);
    setDialRotation(normalizedAngle);
    
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    handleDialInteraction(e.clientX, e.clientY);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        handleDialInteraction(e.clientX, e.clientY);
      }
    };
    
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [handleDialInteraction]);

  useEffect(() => {
    if (!isWindowOpen) {
      stopPlayback();
    }

    return () => {
      stopPlayback();
    };
  }, [isWindowOpen, stopPlayback]);

  if (!isWindowOpen) {
    return null;
  }

  return (
      <WindowFrame
        title={t("apps.whiteNoise.title", "白噪音")}
        onClose={() => {
          stopPlayback();
          onClose();
        }}
      isForeground={isForeground}
      appId="white-noise"
      skipInitialSound={skipInitialSound}
      instanceId={instanceId}
      onNavigateNext={onNavigateNext}
      onNavigatePrevious={onNavigatePrevious}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
       * 收音机主体 - 三段式优雅布局
       * ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className="flex flex-col h-full w-full select-none"
        style={{
          background: theme.body,
          fontFamily: theme.fontFamily,
          fontWeight: theme.fontWeight,
        }}
      >
        {/* ─────────────────────────────────────────────────────────────────────
         * 第一段：扬声器格栅（主体）- 音频叠加在条纹上
         * 迪特·拉姆斯: 形式追随功能，克制的动态
         * ───────────────────────────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden flex-1"
          style={{
            background: theme.grilleBg,
            minHeight: "80px",
          }}
        >
          {/* 格栅背景 - 保持不变 */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(
                0deg,
                ${theme.grilleDark} 0px,
                ${theme.grilleDark} 2px,
                ${theme.grilleLight} 2px,
                ${theme.grilleLight} 5px
              )`,
            }}
          />
          

          
          {/* 品牌标识 - 右下角 */}
          <div
            className="absolute bottom-2 right-3 z-10"
            style={{
              fontSize: "8px",
              fontWeight: 500,
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase",
            }}
          >
            {isClassicTheme ? "AMBIENT" : "braun"}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
         * 第二段：显示屏（紧凑）
         * ───────────────────────────────────────────────────────────────────── */}
        <div
          className="relative flex items-center flex-shrink-0"
          onClick={handleTogglePlayback}
          style={{
            background: theme.screenBg,
            height: "36px",
            borderTop: `1px solid ${theme.screenBorder}`,
            borderBottom: `1px solid ${theme.screenBorder}`,
            cursor: "pointer",
          }}
          aria-label={t("apps.whiteNoise.togglePlayback", "切换播放")}
        >
          {/* 显示内容：声音名 + 波形组（音量 & 音频） */}
          <div className="flex items-center justify-between w-full h-full px-3">
            {/* 左侧：声音名称 */}
            <div
              style={{
                fontFamily: theme.displayFont,
                fontSize: isClassicTheme ? "11px" : "12px",
                fontWeight: 300,
                letterSpacing: "0.1em",
                color: activeSound ? theme.displayText : theme.displayTextDim,
                textShadow: activeSound ? theme.displayGlow : "none",
                textTransform: "uppercase",
              }}
            >
              {activeSound ? activeSoundName : "—"}
            </div>
            
            {/* 右侧：音量 + 波形 */}
            {activeSound && (
              <div className="flex items-end gap-3 h-full py-2">
                {/* 音量指示 */}
                <div className="flex items-end gap-[2px] h-full">
                  {Array.from({ length: 6 }).map((_, i) => {
                    const barHeight = 40 + i * 10;
                    const isActive = volume > i / 6;
                    return (
                      <div
                        key={i}
                        className="w-[2px] transition-all duration-150"
                        style={{
                          height: `${barHeight}%`,
                          background: isActive ? theme.displayText : theme.displayTextDim,
                          boxShadow: isActive ? `0 0 3px ${theme.displayText}` : "none",
                        }}
                      />
                    );
                  })}
                </div>
                
                {/* 分隔点 */}
                <div
                  className="w-[2px] h-[2px] rounded-full self-center"
                  style={{ background: theme.displayTextDim }}
                />
                
                {/* 波形 - 动态跳动 */}
                <div className="flex items-end gap-[2px] h-full">
                  {frequencies.map((freq, i) => {
                    const height = 15 + freq * 80;
                    return (
                      <div
                        key={i}
                        className="w-[2px] transition-all duration-75"
                        style={{
                          height: `${height}%`,
                          background: theme.displayText,
                          boxShadow: freq > 0.2 ? `0 0 3px ${theme.displayText}` : "none",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* 扫描线效果 (仅 Aqua) */}
          {!isClassicTheme && (
            <div
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  0deg,
                  transparent 0px,
                  transparent 1px,
                  rgba(0,0,0,0.3) 1px,
                  rgba(0,0,0,0.3) 2px
                )`,
              }}
            />
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
         * 第三段：控制面板（紧凑）
         * ───────────────────────────────────────────────────────────────────── */}
        <div
          className="flex flex-col justify-center px-3 py-2 flex-shrink-0"
          style={{
            background: theme.panel,
            borderTop: `1px solid ${theme.panelBorder}`,
          }}
        >
          {/* 频道按钮 + 旋钮 一行布局 */}
          <div className="flex items-center justify-between">
            {/* 频道选择按钮 */}
            <div className="flex gap-1">
              {SOUNDS.map((sound, index) => {
                const isActive = activeSound === sound.id;
                return (
                  <button
                    key={sound.id}
                    type="button"
                    onClick={() => playSound(sound)}
                    className="relative group"
                    style={{
                      width: "32px",
                      height: "24px",
                      background: isActive ? theme.buttonActiveBg : theme.buttonBg,
                      border: isClassicTheme ? "none" : `1px solid ${theme.buttonBorder}`,
                      borderRadius: theme.buttonRadius,
                      transition: "all 0.1s ease",
                      boxShadow: isActive ? theme.buttonActiveShadow : theme.buttonShadow,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 500,
                        color: isActive ? theme.buttonActiveText : theme.buttonText,
                      }}
                    >
                      {index + 1}
                    </span>
                    
                    {/* Tooltip */}
                    <div
                      className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10"
                      style={{
                        background: "rgba(0,0,0,0.8)",
                        color: "#fff",
                        fontSize: "9px",
                        borderRadius: "2px",
                      }}
                    >
                      {t(sound.labelKey, sound.fallback)}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 音量旋钮 */}
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontSize: "8px",
                  color: theme.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Vol
              </span>
              <div
                ref={dialRef}
                onMouseDown={handleMouseDown}
                className="relative cursor-pointer"
                style={{
                  width: "36px",
                  height: "36px",
                }}
              >
                {/* 旋钮底座 */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: theme.dialBase,
                    boxShadow: theme.dialShadow,
                  }}
                />
                
                {/* 旋钮主体 */}
                <div
                  className="absolute rounded-full"
                  style={{
                    inset: "3px",
                    background: theme.dialBody,
                    boxShadow: "inset 0 -1px 2px rgba(0,0,0,0.1)",
                    transform: `rotate(${dialRotation}deg)`,
                    transition: isDraggingRef.current ? "none" : "transform 0.1s ease",
                  }}
                >
                  {/* 旋钮指示线 */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{
                      top: "4px",
                      width: "2px",
                      height: "6px",
                      background: theme.dialIndicator,
                      borderRadius: "1px",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WindowFrame>
  );
}
