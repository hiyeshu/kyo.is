/**
 * [STUB] 音频设置 store — 旧应用移除后简化
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AudioSettingsStore {
  uiVolume: number;
  masterVolume: number;
  uiSoundsEnabled: boolean;
  setUiVolume: (v: number) => void;
  setMasterVolume: (v: number) => void;
  setUiSoundsEnabled: (v: boolean) => void;
}

export const useAudioSettingsStore = create<AudioSettingsStore>()(
  persist(
    (set) => ({
      uiVolume: 0.5,
      masterVolume: 1,
      uiSoundsEnabled: true,
      setUiVolume: (v) => set({ uiVolume: v }),
      setMasterVolume: (v) => set({ masterVolume: v }),
      setUiSoundsEnabled: (v) => set({ uiSoundsEnabled: v }),
    }),
    { name: "audio-settings", version: 1 }
  )
);
