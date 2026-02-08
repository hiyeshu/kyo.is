/**
 * [INPUT]: useCustomThemeStore, THEME_SCHEMA, WindowFrame, Select, UI 组件
 * [OUTPUT]: ThemeEditorApp 组件
 * [POS]: 主题编辑器主界面，使用 Select 下拉切换变量分组
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AppProps } from "@/apps/base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { appMetadata, helpItems } from "../metadata";
import { useCustomThemeStore, THEME_SCHEMA } from "@/stores/useCustomThemeStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { themes as systemThemes } from "@/themes";
import type { ThemeVariable } from "@/themes/themeSchema";
import { Export, DownloadSimple, X } from "@phosphor-icons/react";

// ═══════════════════════════════════════════════════════════════════════════════
// 变量编辑控件
// ═══════════════════════════════════════════════════════════════════════════════

function ColorControl({
  value,
  onChange,
  onReset,
  isCustomized,
}: {
  variable: ThemeVariable;
  value: string | number;
  onChange: (value: string) => void;
  onReset: () => void;
  isCustomized: boolean;
}) {
  const strValue = String(value);
  const hexValue = useMemo(() => {
    if (strValue.startsWith("#")) return strValue.slice(0, 7);
    if (strValue.startsWith("rgba") || strValue.startsWith("rgb")) {
      const match = strValue.match(/\d+/g);
      if (match && match.length >= 3) {
        const [r, g, b] = match.slice(0, 3).map(Number);
        return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
      }
    }
    return "#000000";
  }, [strValue]);

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={hexValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-7 h-7 rounded border border-black/20 cursor-pointer shrink-0"
      />
      <Input
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        className="text-[11px] h-7 flex-1 font-mono"
        placeholder="#000000"
      />
      {isCustomized && (
        <button onClick={onReset} className="text-black/40 hover:text-black/70 shrink-0" title="Reset">
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function PatternControl({
  value,
  onChange,
  onReset,
  isCustomized,
}: {
  variable: ThemeVariable;
  value: string | number;
  onChange: (value: string) => void;
  onReset: () => void;
  isCustomized: boolean;
}) {
  const strValue = String(value);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded border border-black/20 shrink-0" style={{ background: strValue }} />
        <div className="flex-1" />
        {isCustomized && (
          <button onClick={onReset} className="text-black/40 hover:text-black/70 shrink-0" title="Reset">
            <X size={12} />
          </button>
        )}
      </div>
      <Textarea
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        className="text-[10px] h-16 font-mono resize-none"
        placeholder="linear-gradient(...)"
      />
    </div>
  );
}

function NumberControl({
  variable,
  value,
  onChange,
  onReset,
  isCustomized,
}: {
  variable: ThemeVariable;
  value: string | number;
  onChange: (value: number | string) => void;
  onReset: () => void;
  isCustomized: boolean;
}) {
  const numValue = useMemo(() => {
    if (typeof value === "number") return value;
    const match = String(value).match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }, [value]);

  const unit = variable.unit ?? "px";
  const min = variable.min ?? 0;
  const max = variable.max ?? 100;
  const step = variable.step ?? 1;

  const handleChange = (num: number) => {
    if (variable.type === "pixels" && unit) {
      onChange(`${num}${unit}`);
    } else {
      onChange(num);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Slider value={[numValue]} onValueChange={([v]) => handleChange(v)} min={min} max={max} step={step} className="flex-1" />
      <span className="text-[11px] text-black/50 w-14 text-right font-mono">{numValue}{unit}</span>
      {isCustomized && (
        <button onClick={onReset} className="text-black/40 hover:text-black/70 shrink-0" title="Reset">
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function ShadowControl({
  value,
  onChange,
  onReset,
  isCustomized,
}: {
  variable: ThemeVariable;
  value: string | number;
  onChange: (value: string) => void;
  onReset: () => void;
  isCustomized: boolean;
}) {
  const strValue = String(value);
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded bg-white border border-black/10 shrink-0" style={{ boxShadow: strValue }} />
      <Input
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        className="text-[11px] h-7 flex-1 font-mono"
        placeholder="0 0 10px rgba(0,0,0,0.3)"
      />
      {isCustomized && (
        <button onClick={onReset} className="text-black/40 hover:text-black/70 shrink-0" title="Reset">
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function VariableControl({
  variable,
  value,
  onChange,
  onReset,
  isCustomized,
}: {
  variable: ThemeVariable;
  value: string | number;
  onChange: (value: string | number) => void;
  onReset: () => void;
  isCustomized: boolean;
}) {
  switch (variable.type) {
    case "color":
      return <ColorControl variable={variable} value={value} onChange={onChange} onReset={onReset} isCustomized={isCustomized} />;
    case "gradient":
    case "pattern":
      return <PatternControl variable={variable} value={value} onChange={onChange} onReset={onReset} isCustomized={isCustomized} />;
    case "number":
    case "pixels":
    case "percentage":
      return <NumberControl variable={variable} value={value} onChange={onChange} onReset={onReset} isCustomized={isCustomized} />;
    case "shadow":
      return <ShadowControl variable={variable} value={value} onChange={onChange} onReset={onReset} isCustomized={isCustomized} />;
    default:
      return (
        <div className="flex items-center gap-2">
          <Input value={String(value)} onChange={(e) => onChange(e.target.value)} className="text-[11px] h-7 flex-1" />
          {isCustomized && (
            <button onClick={onReset} className="text-black/40 hover:text-black/70 shrink-0" title="Reset">
              <X size={12} />
            </button>
          )}
        </div>
      );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════════════════════════════════════════

export function ThemeEditorApp({
  isWindowOpen,
  onClose,
  isForeground,
  skipInitialSound,
  instanceId,
  onNavigateNext,
  onNavigatePrevious,
}: AppProps) {
  const { t } = useTranslation();

  const {
    themes: customThemes,
    editingThemeId,
    updateVariable,
    resetVariable,
    resetEditor,
    saveAsNewTheme,
    updateExistingTheme,
    deleteTheme,
    loadToEditor,
    getVariableValue,
    isVariableCustomized,
    exportTheme,
    importTheme,
  } = useCustomThemeStore();

  const currentTheme = useThemeStore((s) => s.current);

  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [themeName, setThemeName] = useState("");
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 当前选中的变量分组
  const [selectedGroup, setSelectedGroup] = useState(THEME_SCHEMA.groups[0]?.id ?? "window");
  const activeGroup = useMemo(
    () => THEME_SCHEMA.groups.find((g) => g.id === selectedGroup) ?? THEME_SCHEMA.groups[0],
    [selectedGroup]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    if (!themeName.trim()) return;
    if (editingThemeId) {
      updateExistingTheme(editingThemeId, themeName);
    } else {
      saveAsNewTheme(themeName);
    }
    setSaveDialogOpen(false);
    setThemeName("");
  }, [themeName, editingThemeId, saveAsNewTheme, updateExistingTheme]);

  const handleLoadTheme = useCallback((id: string) => {
    loadToEditor(id);
  }, [loadToEditor]);

  const handleExport = useCallback(() => {
    const name = editingThemeId
      ? customThemes.find(t => t.id === editingThemeId)?.name ?? "Custom Theme"
      : "Custom Theme";
    const json = exportTheme(name);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "_")}.theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [editingThemeId, customThemes, exportTheme]);

  const handleImport = useCallback(async () => {
    setImportError("");
    const success = await importTheme(importJson);
    if (success) {
      setImportDialogOpen(false);
      setImportJson("");
    } else {
      setImportError("Invalid theme JSON format");
    }
  }, [importJson, importTheme]);

  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setImportJson(content);
    };
    reader.readAsText(file);
  }, []);

  const openSaveDialog = useCallback(() => {
    const existingName = editingThemeId
      ? customThemes.find(t => t.id === editingThemeId)?.name ?? ""
      : "";
    setThemeName(existingName);
    setSaveDialogOpen(true);
  }, [editingThemeId, customThemes]);

  if (!isWindowOpen) return null;

  return (
    <>
      <WindowFrame
        title={t("apps.theme-editor.name", "Theme Editor")}
        onClose={onClose}
        isForeground={isForeground}
        appId="theme-editor"
        skipInitialSound={skipInitialSound}
        instanceId={instanceId}
        onNavigateNext={onNavigateNext}
        onNavigatePrevious={onNavigatePrevious}
      >
        <div className="flex flex-col h-full w-full p-4 pt-2">
          {/* 顶部：分组选择器 + 当前主题 */}
          <div className="flex items-center gap-3 mb-3">
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEME_SCHEMA.groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[11px] text-black/50 whitespace-nowrap">
              {t("apps.theme-editor.base")}: <span className="font-medium">{systemThemes[currentTheme]?.name ?? currentTheme}</span>
            </div>
          </div>

          {/* 变量列表 */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {activeGroup.variables.map((v) => (
              <div key={v.key} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-[11px]">{v.label}</Label>
                  {isVariableCustomized(v.key) && (
                    <span className="text-[9px] bg-black/10 px-1 rounded">{t("apps.theme-editor.modified")}</span>
                  )}
                </div>
                <VariableControl
                  variable={v}
                  value={getVariableValue(v.key)}
                  onChange={(val) => updateVariable(v.key, val)}
                  onReset={() => resetVariable(v.key)}
                  isCustomized={isVariableCustomized(v.key)}
                />
              </div>
            ))}
          </div>

          {/* 底部操作栏 */}
          <div className="flex flex-col gap-3 pt-3 border-t border-black/10">
            {/* 主题管理行：加载 + 导入导出 */}
            <div className="flex gap-2">
              {customThemes.length > 0 ? (
                <Select
                  value={editingThemeId ?? ""}
                  onValueChange={(id) => id && handleLoadTheme(id)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t("apps.theme-editor.loadSavedTheme")} />
                  </SelectTrigger>
                  <SelectContent>
                    {customThemes.map((theme) => (
                      <SelectItem key={theme.id} value={theme.id}>
                        {theme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex-1" />
              )}
              <Button variant="retro" onClick={() => setImportDialogOpen(true)}>
                <DownloadSimple size={14} />
              </Button>
              <Button variant="retro" onClick={handleExport}>
                <Export size={14} />
              </Button>
            </div>

            {/* 操作行：左侧次要操作，右侧主要操作 */}
            <div className="flex gap-2">
              <Button variant="retro" onClick={resetEditor}>
                {t("apps.theme-editor.reset")}
              </Button>
              {editingThemeId && (
                <Button variant="retro" onClick={() => deleteTheme(editingThemeId)}>
                  {t("apps.theme-editor.delete")}
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="retro" onClick={openSaveDialog}>
                {editingThemeId ? t("apps.theme-editor.update") : t("apps.theme-editor.save")}
              </Button>
            </div>
          </div>
        </div>
      </WindowFrame>

      {/* 保存对话框 */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingThemeId ? t("apps.theme-editor.updateTheme") : t("apps.theme-editor.saveTheme")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              placeholder={t("apps.theme-editor.themeName")}
              className="text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="retro" onClick={() => setSaveDialogOpen(false)}>{t("apps.theme-editor.cancel")}</Button>
            <Button variant="retro" onClick={handleSave} disabled={!themeName.trim()}>
              {editingThemeId ? t("apps.theme-editor.update") : t("apps.theme-editor.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导入对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-sm">{t("apps.theme-editor.importTheme")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileImport} className="hidden" />
            <Button variant="retro" onClick={() => fileInputRef.current?.click()} className="w-full">
              {t("apps.theme-editor.chooseJsonFile")}
            </Button>
            <div className="text-center text-[10px] text-black/40">{t("apps.theme-editor.orPasteBelow")}</div>
            <Textarea
              value={importJson}
              onChange={(e) => { setImportJson(e.target.value); setImportError(""); }}
              placeholder='{"name": "My Theme", "values": {...}}'
              className="text-[10px] h-32 font-mono"
            />
            {importError && <p className="text-[11px] text-red-500">{t("apps.theme-editor.invalidThemeJson")}</p>}
          </div>
          <DialogFooter>
            <Button variant="retro" onClick={() => setImportDialogOpen(false)}>{t("apps.theme-editor.cancel")}</Button>
            <Button variant="retro" onClick={handleImport} disabled={!importJson.trim()}>{t("apps.theme-editor.import")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help/About */}
      <HelpDialog isOpen={helpOpen} onOpenChange={setHelpOpen} helpItems={helpItems} appId="theme-editor" />
      <AboutDialog isOpen={aboutOpen} onOpenChange={setAboutOpen} metadata={appMetadata} appId="theme-editor" />
    </>
  );
}
