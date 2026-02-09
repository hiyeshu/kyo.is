/**
 * [INPUT]: AppProps, WindowFrame, Tabs, stores, WallpaperPicker, VolumeMixer, i18n
 * [OUTPUT]: ControlPanelsApp 组件
 * [POS]: 系统设置主界面，3 个标签页：Appearance, Sound, System
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AppProps } from "@/apps/base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { appMetadata, helpItems } from "../metadata";
import { WallpaperPicker } from "./WallpaperPicker";
import { VolumeMixer } from "./VolumeMixer";
import { ControlPanelsMenuBar } from "./ControlPanelsMenuBar";
import { useThemeStore } from "@/stores/useThemeStore";
import { useDisplaySettingsStore } from "@/stores/useDisplaySettingsStore";
import { useAudioSettingsStore } from "@/stores/useAudioSettingsStore";
import { themes } from "@/themes";
import { OsThemeId } from "@/themes/types";
import { getTabStyles, getWindowsLegacyTabMenuClasses } from "@/utils/tabStyles";
import { toast } from "sonner";
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, changeLanguage } from "@/lib/i18n";

// ═══════════════════════════════════════════════════════════════════════════════
// Backup / Restore
// ═══════════════════════════════════════════════════════════════════════════════

const BACKUP_KEYS = [
  "kyo:theme",
  "kyo:theme-sync-wallpaper",
  "kyo:display-settings",
  "kyo:dock",
  "kyo:bookmarks",
  "audio-settings",
];

function createBackup(): string {
  const backup: Record<string, unknown> = {
    _meta: {
      version: 1,
      timestamp: new Date().toISOString(),
      app: "kyo.is",
    },
  };
  for (const key of BACKUP_KEYS) {
    const val = localStorage.getItem(key);
    if (val) {
      try {
        backup[key] = JSON.parse(val);
      } catch {
        backup[key] = val;
      }
    }
  }
  return JSON.stringify(backup, null, 2);
}

function restoreBackup(json: string, t: (key: string) => string): boolean {
  try {
    const data = JSON.parse(json);
    if (!data._meta) {
      toast.error(t("apps.control-panels.invalidBackupFile"));
      return false;
    }
    for (const key of BACKUP_KEYS) {
      if (data[key] !== undefined) {
        localStorage.setItem(
          key,
          typeof data[key] === "string" ? data[key] : JSON.stringify(data[key])
        );
      }
    }
    toast.success(t("apps.control-panels.backupRestoredReloading"));
    setTimeout(() => window.location.reload(), 1000);
    return true;
  } catch {
    toast.error(t("apps.control-panels.failedToParseBackup"));
    return false;
  }
}

function resetAllSettings(t: (key: string) => string) {
  for (const key of BACKUP_KEYS) {
    localStorage.removeItem(key);
  }
  // Clear IndexedDB
  indexedDB.deleteDatabase("Kyo");
  toast.success(t("apps.control-panels.settingsResetReloading"));
  setTimeout(() => window.location.reload(), 1000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export function ControlPanelsApp({
  isWindowOpen,
  onClose,
  isForeground,
  skipInitialSound,
  instanceId,
  onNavigateNext,
  onNavigatePrevious,
}: AppProps) {
  const { t, i18n } = useTranslation();

  // ─── Dialog States ───────────────────────────────────────────────────────────
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Theme ───────────────────────────────────────────────────────────────────
  const currentTheme = useThemeStore((s) => s.current);
  const setTheme = useThemeStore((s) => s.setTheme);
  const syncWallpaper = useThemeStore((s) => s.syncWallpaper);
  const setSyncWallpaper = useThemeStore((s) => s.setSyncWallpaper);

  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  const isWindowsLegacyTheme = isXpTheme;
  const isMacOSXTheme = currentTheme === "macosx";
  const isClassicMacTheme = currentTheme === "system7" || isMacOSXTheme;
  const tabStyles = getTabStyles(currentTheme);

  // ─── Audio ───────────────────────────────────────────────────────────────────
  const uiSoundsEnabled = useAudioSettingsStore((s) => s.uiSoundsEnabled);
  const setUiSoundsEnabled = useAudioSettingsStore((s) => s.setUiSoundsEnabled);

  // ─── Display ─────────────────────────────────────────────────────────────────
  const debugMode = useDisplaySettingsStore((s) => s.debugMode);
  const setDebugMode = useDisplaySettingsStore((s) => s.setDebugMode);

  // ─── Window Title ────────────────────────────────────────────────────────────
  const windowTitle = t("apps.control-panels.name");

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleBackup = () => {
    const json = createBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kyo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("apps.control-panels.backupDownloaded"));
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        restoreBackup(reader.result, t);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmReset = () => {
    setIsConfirmResetOpen(false);
    resetAllSettings(t);
  };

  // ─── Menu Bar ────────────────────────────────────────────────────────────────
  const menuBar = (
    <ControlPanelsMenuBar
      onClose={onClose}
      onShowHelp={() => setIsHelpDialogOpen(true)}
      onShowAbout={() => setIsAboutDialogOpen(true)}
    />
  );

  if (!isWindowOpen) return null;

  return (
    <>
      {!isXpTheme && isForeground && menuBar}
      <WindowFrame
        title={windowTitle}
        onClose={onClose}
        isForeground={isForeground}
        appId="control-panels"
        skipInitialSound={skipInitialSound}
        instanceId={instanceId}
        onNavigateNext={onNavigateNext}
        onNavigatePrevious={onNavigatePrevious}
        menuBar={isXpTheme ? menuBar : undefined}
      >
        <div
          className={`flex flex-col h-full w-full ${
            isWindowsLegacyTheme ? "pt-0 pb-2 px-2" : ""
          } ${
            isClassicMacTheme
              ? isMacOSXTheme
                ? "p-4 pt-2"
                : "p-4 bg-[#E3E3E3]"
              : ""
          }`}
        >
          <Tabs defaultValue="appearance" className="w-full h-full">
            {isWindowsLegacyTheme ? (
              <TabsList asChild>
                <menu role="tablist" className={getWindowsLegacyTabMenuClasses()}>
                  <TabsTrigger value="appearance">
                    {t("apps.control-panels.appearance")}
                  </TabsTrigger>
                  <TabsTrigger value="sound">
                    {t("apps.control-panels.sound")}
                  </TabsTrigger>
                  <TabsTrigger value="system">
                    {t("apps.control-panels.system")}
                  </TabsTrigger>
                </menu>
              </TabsList>
            ) : (
              <TabsList className={tabStyles.tabListClasses}>
                <TabsTrigger value="appearance" className={tabStyles.tabTriggerClasses}>
                  {t("apps.control-panels.appearance")}
                </TabsTrigger>
                <TabsTrigger value="sound" className={tabStyles.tabTriggerClasses}>
                  {t("apps.control-panels.sound")}
                </TabsTrigger>
                <TabsTrigger value="system" className={tabStyles.tabTriggerClasses}>
                  {t("apps.control-panels.system")}
                </TabsTrigger>
              </TabsList>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* Appearance Tab */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="appearance" className={tabStyles.tabContentClasses}>
              <div className="space-y-4 h-full overflow-y-auto p-4 pt-6">
                {/* Theme Selector */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <Label>{t("apps.control-panels.theme")}</Label>
                    <Label className="text-[11px] text-neutral-600 font-geneva-12">
                      {t("apps.control-panels.themeDescription")}
                    </Label>
                  </div>
                  <Select
                    value={currentTheme}
                    onValueChange={(v) => setTheme(v as OsThemeId)}
                  >
                    <SelectTrigger className="w-[140px] flex-shrink-0">
                      <SelectValue>
                        {themes[currentTheme]?.name || t("apps.control-panels.select")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(themes).map(([id, theme]) => (
                        <SelectItem key={id} value={id}>
                          {theme.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Language Selector */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <Label>{t("settings.language.title")}</Label>
                    <Label className="text-[11px] text-neutral-600 font-geneva-12">
                      {t("settings.language.description")}
                    </Label>
                  </div>
                  <Select
                    value={i18n.language}
                    onValueChange={(lang) => {
                      changeLanguage(lang);
                      // 用简单的语言名称作为 toast，避免异步翻译问题
                      toast.success(`✓ ${LANGUAGE_LABELS[lang as keyof typeof LANGUAGE_LABELS]}`);
                    }}
                  >
                    <SelectTrigger className="w-[140px] flex-shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {LANGUAGE_LABELS[lang]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sync Wallpaper with Theme */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <Label>{t("apps.control-panels.syncWallpaper")}</Label>
                    <Label className="text-[11px] text-neutral-600 font-geneva-12">
                      {t("apps.control-panels.syncWallpaperDescription")}
                    </Label>
                  </div>
                  <Switch
                    checked={syncWallpaper}
                    onCheckedChange={setSyncWallpaper}
                    className="data-[state=checked]:bg-[#000000]"
                  />
                </div>

                <div className="border-t my-4" style={tabStyles.separatorStyle} />

                {/* Wallpaper Picker */}
                <WallpaperPicker />
              </div>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* Sound Tab */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="sound" className={tabStyles.tabContentClasses}>
              <div className="space-y-4 h-full overflow-y-auto p-4 pt-6">
                {/* UI Sounds Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <Label>{t("apps.control-panels.uiSounds")}</Label>
                    <Label className="text-[11px] text-neutral-600 font-geneva-12">
                      {t("apps.control-panels.uiSoundsDescription")}
                    </Label>
                  </div>
                  <Switch
                    checked={uiSoundsEnabled}
                    onCheckedChange={setUiSoundsEnabled}
                    className="data-[state=checked]:bg-[#000000]"
                  />
                </div>

                <div className="border-t my-4" style={tabStyles.separatorStyle} />

                {/* Volume Mixer */}
                <VolumeMixer />
              </div>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* System Tab */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="system" className={tabStyles.tabContentClasses}>
              <div className="space-y-4 h-full overflow-y-auto p-4">
                {/* Backup / Restore */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button variant="retro" onClick={handleBackup} className="flex-1">
                      {t("apps.control-panels.backup")}
                    </Button>
                    <Button
                      variant="retro"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1"
                    >
                      {t("apps.control-panels.restore")}
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleRestore}
                      accept=".json"
                      className="hidden"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-600 font-geneva-12">
                    {t("apps.control-panels.backupRestoreDescription")}
                  </p>
                </div>

                {/* Reset All */}
                <div className="space-y-2">
                  <Button
                    variant="retro"
                    onClick={() => setIsConfirmResetOpen(true)}
                    className="w-full"
                  >
                    {t("apps.control-panels.resetAllSettings")}
                  </Button>
                  <p className="text-[11px] text-neutral-600 font-geneva-12">
                    {t("apps.control-panels.resetAllSettingsDescription")}
                  </p>
                </div>

                <div className="border-t my-4" style={tabStyles.separatorStyle} />

                {/* Debug Mode */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <Label>{t("apps.control-panels.debugMode")}</Label>
                    <Label className="text-[11px] text-neutral-600 font-geneva-12">
                      {t("apps.control-panels.debugModeDescription")}
                    </Label>
                  </div>
                  <Switch
                    checked={debugMode}
                    onCheckedChange={setDebugMode}
                    className="data-[state=checked]:bg-[#000000]"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Dialogs */}
        <HelpDialog
          isOpen={isHelpDialogOpen}
          onOpenChange={setIsHelpDialogOpen}
          helpItems={helpItems}
          appId="control-panels"
        />
        <AboutDialog
          isOpen={isAboutDialogOpen}
          onOpenChange={setIsAboutDialogOpen}
          metadata={appMetadata}
          appId="control-panels"
        />
        <ConfirmDialog
          isOpen={isConfirmResetOpen}
          onOpenChange={setIsConfirmResetOpen}
          onConfirm={handleConfirmReset}
          title={t("common.system.resetAllSettings")}
          description={t("common.system.resetAllSettingsDesc")}
        />
      </WindowFrame>
    </>
  );
}
