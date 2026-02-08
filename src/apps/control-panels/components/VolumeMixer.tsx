/**
 * [INPUT]: Slider, Button, useSound, useAudioSettingsStore, i18n
 * [OUTPUT]: VolumeMixer 组件
 * [POS]: 简化版音量混合器，只有 Master 和 UI 两个滑块
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SpeakerHigh, Cursor } from "@phosphor-icons/react";
import { useSound, Sounds } from "@/hooks/useSound";
import { useAudioSettingsStore } from "@/stores/useAudioSettingsStore";

export function VolumeMixer() {
  const { t } = useTranslation();
  const { play: playVolumeChangeSound } = useSound(Sounds.VOLUME_CHANGE);

  // Master Volume
  const masterVolume = useAudioSettingsStore((s) => s.masterVolume);
  const setMasterVolume = useAudioSettingsStore((s) => s.setMasterVolume);
  const [prevMasterVolume, setPrevMasterVolume] = useState(masterVolume || 1);

  // UI Volume
  const uiVolume = useAudioSettingsStore((s) => s.uiVolume);
  const setUiVolume = useAudioSettingsStore((s) => s.setUiVolume);
  const [prevUiVolume, setPrevUiVolume] = useState(uiVolume || 0.5);

  const handleMasterMuteToggle = () => {
    if (masterVolume > 0) {
      setPrevMasterVolume(masterVolume);
      setMasterVolume(0);
    } else {
      setMasterVolume(prevMasterVolume);
    }
  };

  const handleUiMuteToggle = () => {
    if (uiVolume > 0) {
      setPrevUiVolume(uiVolume);
      setUiVolume(0);
    } else {
      setUiVolume(prevUiVolume);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex justify-around items-end py-2">
        {/* Master Volume */}
        <div className="flex flex-col items-center gap-0">
          <Slider
            orientation="vertical"
            min={0}
            max={1}
            step={0.05}
            value={[masterVolume]}
            onValueChange={(v) => {
              setMasterVolume(v[0]);
              if (v[0] > 0) setPrevMasterVolume(v[0]);
            }}
            onValueCommit={() => playVolumeChangeSound()}
            className="h-18 w-5"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMasterMuteToggle}
                className={`h-8 w-8 ${masterVolume === 0 ? "opacity-40" : ""}`}
              >
                <SpeakerHigh size={14} weight="fill" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{t("apps.control-panels.masterVolume")}</p>
            </TooltipContent>
          </Tooltip>
          <p className="text-[10px] font-geneva-12 text-neutral-600">
            {t("apps.control-panels.master")}
          </p>
        </div>

        {/* UI Volume */}
        <div className="flex flex-col items-center gap-0">
          <Slider
            orientation="vertical"
            min={0}
            max={1}
            step={0.05}
            value={[uiVolume]}
            onValueChange={(v) => {
              setUiVolume(v[0]);
              if (v[0] > 0) setPrevUiVolume(v[0]);
            }}
            onValueCommit={() => playVolumeChangeSound()}
            className="h-18 w-5"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleUiMuteToggle}
                className={`h-8 w-8 ${uiVolume === 0 ? "opacity-40" : ""}`}
              >
                <Cursor size={14} weight="fill" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{t("apps.control-panels.uiVolume")}</p>
            </TooltipContent>
          </Tooltip>
          <p className="text-[10px] font-geneva-12 text-neutral-600">
            {t("apps.control-panels.ui")}
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
