/**
 * [INPUT]: useCustomThemeStore, THEME_SCHEMA, PRESET_SKINS, WindowFrame, UI 组件
 * [OUTPUT]: ThemeEditorApp 组件
 * [POS]: 主题编辑器主界面，Expert Mode 可视化编辑所有 CSS 变量
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useMemo, useRef, useCallback } from "react";
import { AppProps } from "@/apps/base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
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
import {
  useCustomThemeStore,
  THEME_SCHEMA,
  PRESET_SKINS,
} from "@/stores/useCustomThemeStore";
import type { ThemeVariable, ThemeVariableGroup } from "@/themes/themeSchema";
import {
  FloppyDisk,
  ArrowCounterClockwise,
  Trash,
  CaretDown,
  CaretRight,
  Export,
  DownloadSimple,
  Swatches,
  X,
} from "@phosphor-icons/react";

// ═══════════════════════════════════════════════════════════════════════════════
// 变量编辑控件
// ═══════════════════════════════════════════════════════════════════════════════

/** 颜色选择器 */
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
  
  // 简单的 rgba/rgb → hex 转换（用于 color input）
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
        placeholder="#000000 or rgba(...)"
      />
      {isCustomized && (
        <button
          onClick={onReset}
          className="text-black/40 hover:text-black/70 shrink-0"
          title="Reset to default"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

/** 渐变/纹理输入（textarea） */
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
        {/* 预览方块 */}
        <div
          className="w-7 h-7 rounded border border-black/20 shrink-0"
          style={{ background: strValue }}
        />
        <div className="flex-1" />
        {isCustomized && (
          <button
            onClick={onReset}
            className="text-black/40 hover:text-black/70 shrink-0"
            title="Reset to default"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <Textarea
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        className="text-[10px] h-16 font-mono resize-none"
        placeholder="linear-gradient(...) or repeating-linear-gradient(...)"
      />
    </div>
  );
}

/** 数值滑块 */
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
  // 从字符串中提取数字（如 "7px" → 7）
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
    // 如果变量类型是 pixels 且有 unit，输出带单位的字符串
    if (variable.type === "pixels" && unit) {
      onChange(`${num}${unit}`);
    } else {
      onChange(num);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Slider
        value={[numValue]}
        onValueChange={([v]) => handleChange(v)}
        min={min}
        max={max}
        step={step}
        className="flex-1"
      />
      <span className="text-[11px] text-black/50 w-14 text-right font-mono">
        {numValue}{unit}
      </span>
      {isCustomized && (
        <button
          onClick={onReset}
          className="text-black/40 hover:text-black/70 shrink-0"
          title="Reset to default"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

/** 字体输入 */
function FontControl({
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
      <Input
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        className="text-[11px] h-7 flex-1 font-mono"
        placeholder="Font family stack..."
      />
      {isCustomized && (
        <button
          onClick={onReset}
          className="text-black/40 hover:text-black/70 shrink-0"
          title="Reset to default"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

/** 阴影输入（文本） */
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
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {/* 阴影预览 */}
        <div
          className="w-7 h-7 rounded bg-white border border-black/10 shrink-0"
          style={{ boxShadow: strValue }}
        />
        <Input
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          className="text-[11px] h-7 flex-1 font-mono"
          placeholder="0 0 10px rgba(0,0,0,0.3)"
        />
        {isCustomized && (
          <button
            onClick={onReset}
            className="text-black/40 hover:text-black/70 shrink-0"
            title="Reset to default"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

/** 根据变量类型选择对应控件 */
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
      return (
        <ColorControl
          variable={variable}
          value={value}
          onChange={onChange}
          onReset={onReset}
          isCustomized={isCustomized}
        />
      );
    case "gradient":
    case "pattern":
      return (
        <PatternControl
          variable={variable}
          value={value}
          onChange={onChange}
          onReset={onReset}
          isCustomized={isCustomized}
        />
      );
    case "number":
    case "pixels":
    case "percentage":
      return (
        <NumberControl
          variable={variable}
          value={value}
          onChange={onChange}
          onReset={onReset}
          isCustomized={isCustomized}
        />
      );
    case "font":
      return (
        <FontControl
          variable={variable}
          value={value}
          onChange={onChange}
          onReset={onReset}
          isCustomized={isCustomized}
        />
      );
    case "shadow":
      return (
        <ShadowControl
          variable={variable}
          value={value}
          onChange={onChange}
          onReset={onReset}
          isCustomized={isCustomized}
        />
      );
    default:
      return (
        <Input
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="text-[11px] h-7"
        />
      );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 变量分组面板
// ═══════════════════════════════════════════════════════════════════════════════

function VariableGroupPanel({
  group,
  getVariableValue,
  isVariableCustomized,
  updateVariable,
  resetVariable,
  defaultOpen = false,
}: {
  group: ThemeVariableGroup;
  getVariableValue: (key: string) => string | number;
  isVariableCustomized: (key: string) => boolean;
  updateVariable: (key: string, value: string | number) => void;
  resetVariable: (key: string) => void;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  // 统计该组有多少自定义项
  const customizedCount = useMemo(() => {
    return group.variables.filter(v => isVariableCustomized(v.key)).length;
  }, [group.variables, isVariableCustomized]);

  return (
    <div className="border-b border-black/5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full py-2 px-1 hover:bg-black/5 rounded transition-colors text-left"
      >
        {isOpen ? <CaretDown size={12} /> : <CaretRight size={12} />}
        <span className="text-[12px] font-medium">{group.label}</span>
        {customizedCount > 0 && (
          <span className="text-[10px] bg-black/10 px-1.5 rounded">
            {customizedCount} modified
          </span>
        )}
        {group.description && (
          <span className="text-[10px] text-black/40 ml-auto">{group.description}</span>
        )}
      </button>
      {isOpen && (
        <div className="space-y-3 pl-4 pb-3 pt-1">
          {group.variables.map((v) => (
            <div key={v.key} className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-[11px] text-black/70">{v.label}</Label>
                {v.description && (
                  <span className="text-[10px] text-black/40">({v.description})</span>
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
      )}
    </div>
  );
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
  const {
    themes,
    editorBaseTheme,
    editingThemeId,
    updateVariable,
    resetVariable,
    resetEditor,
    applyPresetSkin,
    saveAsNewTheme,
    updateExistingTheme,
    deleteTheme,
    loadToEditor,
    getVariableValue,
    isVariableCustomized,
    exportTheme,
    importTheme,
  } = useCustomThemeStore();

  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [themeName, setThemeName] = useState("");
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // 操作处理
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
      ? themes.find(t => t.id === editingThemeId)?.name ?? "Custom Theme"
      : "Custom Theme";
    const json = exportTheme(name);
    
    // 下载文件
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "_")}.theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [editingThemeId, themes, exportTheme]);

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
      ? themes.find(t => t.id === editingThemeId)?.name ?? ""
      : "";
    setThemeName(existingName);
    setSaveDialogOpen(true);
  }, [editingThemeId, themes]);

  if (!isWindowOpen) return null;

  return (
    <>
      <WindowFrame
        title="Theme Editor"
        onClose={onClose}
        isForeground={isForeground}
        appId="theme-editor"
        skipInitialSound={skipInitialSound}
        instanceId={instanceId}
        onNavigateNext={onNavigateNext}
        onNavigatePrevious={onNavigatePrevious}
      >
        <div className="flex flex-col h-full">
          {/* ═══════════════════════════════════════════════════════════════════
              顶部工具栏
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-black/10 bg-white/50">
            {/* 预设皮肤选择 */}
            <div className="flex items-center gap-1">
              <Swatches size={14} className="text-black/50" />
              <span className="text-[11px] text-black/50">Preset:</span>
              <div className="flex gap-1">
                {PRESET_SKINS.map((skin) => (
                  <button
                    key={skin.id}
                    onClick={() => applyPresetSkin(skin.id)}
                    title={skin.description}
                    className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                      editorBaseTheme === skin.id
                        ? "bg-black text-white border-black"
                        : "bg-white border-black/20 hover:border-black/40"
                    }`}
                  >
                    {skin.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1" />

            {/* 导入导出 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setImportDialogOpen(true)}
              className="h-6 px-2 text-[10px]"
            >
              <DownloadSimple size={12} className="mr-1" />
              Import
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              className="h-6 px-2 text-[10px]"
            >
              <Export size={12} className="mr-1" />
              Export
            </Button>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              主内容区：变量分组列表
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {THEME_SCHEMA.groups.map((group, idx) => (
              <VariableGroupPanel
                key={group.id}
                group={group}
                getVariableValue={getVariableValue}
                isVariableCustomized={isVariableCustomized}
                updateVariable={updateVariable}
                resetVariable={resetVariable}
                defaultOpen={idx === 0} // 第一组默认展开
              />
            ))}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              底部操作栏
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-black/10 bg-white/50">
            {/* 已保存的主题 */}
            {themes.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto max-w-[200px]">
                {themes.map((t) => (
                  <div
                    key={t.id}
                    className={`group flex items-center gap-1 px-2 py-1 text-[10px] rounded border cursor-pointer transition-colors whitespace-nowrap ${
                      editingThemeId === t.id
                        ? "bg-black text-white border-black"
                        : "bg-white border-black/20 hover:border-black/40"
                    }`}
                    onClick={() => handleLoadTheme(t.id)}
                  >
                    <span>{t.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTheme(t.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-400"
                    >
                      <Trash size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1" />

            {/* 操作按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={resetEditor}
              className="h-7 text-[11px]"
            >
              <ArrowCounterClockwise size={12} className="mr-1" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={openSaveDialog}
              className="h-7 text-[11px]"
            >
              <FloppyDisk size={12} className="mr-1" />
              {editingThemeId ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      </WindowFrame>

      {/* ═══════════════════════════════════════════════════════════════════════
          保存对话框
          ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingThemeId ? "Update Theme" : "Save Theme"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              placeholder="Theme name"
              className="text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!themeName.trim()}>
              {editingThemeId ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          导入对话框
          ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-sm">Import Theme</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-[11px]"
              >
                <DownloadSimple size={12} className="mr-1" />
                Choose JSON File
              </Button>
            </div>
            <div className="text-center text-[10px] text-black/40">or paste JSON below</div>
            <Textarea
              value={importJson}
              onChange={(e) => {
                setImportJson(e.target.value);
                setImportError("");
              }}
              placeholder='{"name": "My Theme", "values": {...}}'
              className="text-[10px] h-32 font-mono"
            />
            {importError && (
              <p className="text-[11px] text-red-500">{importError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleImport} disabled={!importJson.trim()}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════
          帮助和关于对话框
          ═══════════════════════════════════════════════════════════════════════ */}
      <HelpDialog
        isOpen={helpOpen}
        onOpenChange={setHelpOpen}
        helpItems={helpItems}
        appId="theme-editor"
      />
      <AboutDialog
        isOpen={aboutOpen}
        onOpenChange={setAboutOpen}
        metadata={appMetadata}
        appId="theme-editor"
      />
    </>
  );
}
