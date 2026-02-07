/**
 * [INPUT]: 无
 * [OUTPUT]: ThemeSchema, ThemeVariableGroup, ThemeVariable, THEME_SCHEMA, PRESET_SKINS, getComputedThemeValue
 * [POS]: 主题变量的完整定义，与 themes.css 保持同步，被 useCustomThemeStore 和 ThemeEditor 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 * 
 * ⚠️ 单一真相源架构：
 * themes.css 是 CSS 变量的唯一真相源，本文件仅描述变量的 UI 元数据
 * 所有实际值通过 getComputedThemeValue() 从 DOM 运行时读取
 */

// ─── 变量类型 ─────────────────────────────────────────────────────────────────

export type VariableType = 
  | "color"           // 颜色选择器
  | "gradient"        // 渐变（可输入 CSS 渐变）
  | "number"          // 数字滑块
  | "pixels"          // 像素值滑块
  | "percentage"      // 百分比滑块
  | "font"            // 字体选择器
  | "shadow"          // 阴影（复合值）
  | "pattern"         // 纹理/图案（CSS 背景）
  | "select";         // 下拉选择

export interface ThemeVariable {
  key: string;                    // CSS 变量名（不含 --）
  label: string;                  // 显示名称
  type: VariableType;
  description?: string;           // 说明
  // 类型相关配置
  min?: number;                   // number/pixels 最小值
  max?: number;                   // number/pixels 最大值
  step?: number;                  // 步进值
  options?: string[];             // select 选项
  unit?: string;                  // 单位（px, rem, %）
}

export interface ThemeVariableGroup {
  id: string;
  label: string;
  description?: string;
  variables: ThemeVariable[];
}

export interface ThemeSchema {
  version: number;
  groups: ThemeVariableGroup[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 完整变量 Schema - 与 themes.css 同步（仅 UI 元数据，无 defaultValue）
// ═══════════════════════════════════════════════════════════════════════════════

export const THEME_SCHEMA: ThemeSchema = {
  version: 2,
  groups: [
    // ─────────────────────────────────────────────────────────────────────────
    // Window 窗口
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "window",
      label: "Window",
      description: "窗口背景、边框、阴影",
      variables: [
        { key: "os-color-window-bg", label: "Background", type: "color" },
        { key: "os-color-window-border", label: "Border", type: "color" },
        { key: "os-color-window-border-inactive", label: "Border (Inactive)", type: "color" },
        { key: "os-metrics-border-width", label: "Border Width", type: "pixels", min: 0, max: 4, step: 0.5, unit: "px" },
        { key: "os-metrics-radius", label: "Border Radius", type: "pixels", min: 0, max: 2, step: 0.05, unit: "rem" },
        { key: "os-window-shadow", label: "Shadow", type: "shadow" },
        { key: "os-pinstripe-window", label: "Texture", type: "pattern" },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Titlebar 标题栏
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "titlebar",
      label: "Titlebar",
      description: "标题栏样式",
      variables: [
        { key: "os-color-titlebar-active-bg", label: "Background (Active)", type: "gradient" },
        { key: "os-color-titlebar-inactive-bg", label: "Background (Inactive)", type: "gradient" },
        { key: "os-color-titlebar-text", label: "Text", type: "color" },
        { key: "os-color-titlebar-text-inactive", label: "Text (Inactive)", type: "color" },
        { key: "os-color-titlebar-border", label: "Border", type: "color" },
        { key: "os-color-titlebar-border-inactive", label: "Border (Inactive)", type: "color" },
        { key: "os-metrics-titlebar-height", label: "Height", type: "pixels", min: 1, max: 3, step: 0.125, unit: "rem" },
        { key: "os-metrics-titlebar-border-width", label: "Border Width", type: "pixels", min: 0, max: 3, step: 1, unit: "px" },
        { key: "os-pinstripe-titlebar", label: "Texture", type: "pattern" },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Traffic Lights 红绿灯按钮
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "trafficLights",
      label: "Traffic Lights",
      description: "窗口控制按钮",
      variables: [
        { key: "os-color-traffic-light-close", label: "Close", type: "color" },
        { key: "os-color-traffic-light-minimize", label: "Minimize", type: "color" },
        { key: "os-color-traffic-light-maximize", label: "Maximize", type: "color" },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Menubar 菜单栏
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "menubar",
      label: "Menubar",
      description: "顶部菜单栏",
      variables: [
        { key: "os-color-menubar-bg", label: "Background", type: "gradient" },
        { key: "os-color-menubar-border", label: "Border", type: "color" },
        { key: "os-color-menubar-text", label: "Text", type: "color" },
        { key: "os-metrics-menubar-height", label: "Height", type: "pixels", min: 20, max: 40, step: 1, unit: "px" },
        { key: "os-pinstripe-menubar", label: "Texture", type: "pattern" },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Dock
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "dock",
      label: "Dock",
      description: "底部 Dock 栏",
      variables: [
        { key: "os-color-dock-bg", label: "Background", type: "gradient" },
        { key: "os-color-dock-border", label: "Border", type: "color" },
        { key: "os-color-dock-shadow", label: "Shadow", type: "shadow" },
        { key: "os-color-dock-indicator", label: "Running Indicator", type: "color" },
        { key: "os-color-dock-divider", label: "Divider", type: "color" },
        { key: "os-color-dock-tooltip-bg", label: "Tooltip Background", type: "color" },
        { key: "os-color-dock-tooltip-text", label: "Tooltip Text", type: "color" },
        { key: "os-metrics-dock-radius", label: "Border Radius", type: "pixels", min: 0, max: 30, step: 1, unit: "px" },
        { key: "os-metrics-dock-icon-size", label: "Icon Size", type: "pixels", min: 32, max: 80, step: 4, unit: "px" },
        { key: "os-dock-blur", label: "Blur Amount", type: "pixels", min: 0, max: 40, step: 2, unit: "px" },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Selection 选中状态
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "selection",
      label: "Selection",
      description: "选中/高亮状态",
      variables: [
        { key: "os-color-selection-bg", label: "Background", type: "color" },
        { key: "os-color-selection-text", label: "Text", type: "color" },
        { key: "os-color-selection-glow", label: "Focus Glow", type: "color" },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Buttons 按钮
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "buttons",
      label: "Buttons",
      description: "按钮样式",
      variables: [
        { key: "os-color-button-face", label: "Background", type: "color" },
        { key: "os-color-button-highlight", label: "Highlight", type: "color" },
        { key: "os-color-button-shadow", label: "Shadow", type: "color" },
        { key: "os-color-button-active-face", label: "Active Background", type: "color" },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Typography 文字
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "typography",
      label: "Typography",
      description: "文字和字体",
      variables: [
        { key: "os-color-text-primary", label: "Primary", type: "color" },
        { key: "os-color-text-secondary", label: "Secondary", type: "color" },
        { key: "os-color-text-disabled", label: "Disabled", type: "color" },
        { key: "os-font-ui", label: "UI Font", type: "font" },
        { key: "os-font-mono", label: "Mono Font", type: "font" },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Textures 纹理
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "textures",
      label: "Textures",
      description: "工具栏和背景纹理",
      variables: [
        { key: "os-texture-toolbar-image", label: "Toolbar Image", type: "pattern" },
        { key: "os-texture-toolbar-size", label: "Toolbar Size", type: "select", options: ["cover", "contain", "auto", "100% 100%"] },
        { key: "os-texture-toolbar-repeat", label: "Toolbar Repeat", type: "select", options: ["no-repeat", "repeat", "repeat-x", "repeat-y"] },
        { key: "os-texture-toolbar-position", label: "Toolbar Position", type: "select", options: ["center", "top", "bottom", "left", "right"] },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// 预设皮肤 - 对应 themes.css 中的 data-os-theme 值
// ═══════════════════════════════════════════════════════════════════════════════

export type PresetSkinId = "macosx" | "system7" | "xp" | "win98";

export interface PresetSkin {
  id: PresetSkinId;
  name: string;
  description: string;
  /** 对应 themes.css 中 data-os-theme 属性值 */
  themeAttribute: string;
}

/**
 * 预设皮肤列表
 * 注意：这些皮肤的实际样式定义在 themes.css 中
 * 此处仅提供 UI 显示信息和主题切换所需的 attribute 值
 */
export const PRESET_SKINS: PresetSkin[] = [
  {
    id: "macosx",
    name: "Aqua",
    description: "macOS 经典水晶风格",
    themeAttribute: "macosx",
  },
  {
    id: "system7",
    name: "System 7",
    description: "复古 Mac 黑白风格",
    themeAttribute: "system7",
  },
  {
    id: "xp",
    name: "Luna",
    description: "Windows XP 蓝色风格",
    themeAttribute: "xp",
  },
  {
    id: "win98",
    name: "Classic",
    description: "Windows 98 经典风格",
    themeAttribute: "win98",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 主题默认壁纸映射
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 每个主题的默认壁纸
 * 切换主题时可选择是否同步切换壁纸
 */
export const THEME_DEFAULT_WALLPAPERS: Record<PresetSkinId, string> = {
  macosx: "/wallpapers/photos/aqua/water.jpg",
  system7: "/wallpapers/tiles/default.png",
  xp: "/wallpapers/videos/bliss_og.mp4",
  win98: "/wallpapers/tiles/bubbles_bondi.png",
};

/**
 * 获取主题的默认壁纸
 */
export function getThemeDefaultWallpaper(themeId: PresetSkinId): string {
  return THEME_DEFAULT_WALLPAPERS[themeId] ?? THEME_DEFAULT_WALLPAPERS.macosx;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 运行时 CSS 变量读取（单一真相源核心）
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 从 DOM 读取 CSS 变量的当前计算值
 * 这是单一真相源架构的核心：所有值从 themes.css 定义的实际 CSS 读取
 * 
 * @param key 变量名（不含 --）
 * @returns CSS 变量的当前值，如果不存在返回空字符串
 */
export function getComputedThemeValue(key: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--${key}`)
    .trim();
}

/**
 * 批量读取多个 CSS 变量的当前值
 * 
 * @param keys 变量名数组（不含 --）
 * @returns 变量名到值的映射
 */
export function getComputedThemeValues(keys: string[]): Record<string, string> {
  if (typeof document === "undefined") return {};
  const style = getComputedStyle(document.documentElement);
  const values: Record<string, string> = {};
  for (const key of keys) {
    values[key] = style.getPropertyValue(`--${key}`).trim();
  }
  return values;
}

/**
 * 获取 Schema 中所有变量的当前 CSS 值
 * 
 * @returns 所有变量的当前值映射
 */
export function getAllComputedThemeValues(): Record<string, string> {
  const keys: string[] = [];
  for (const group of THEME_SCHEMA.groups) {
    for (const variable of group.variables) {
      keys.push(variable.key);
    }
  }
  return getComputedThemeValues(keys);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 根据预设 ID 获取皮肤信息
 */
export function getPresetSkin(id: PresetSkinId): PresetSkin | undefined {
  return PRESET_SKINS.find((s) => s.id === id);
}

/**
 * 获取变量定义
 */
export function getVariableDefinition(key: string): ThemeVariable | undefined {
  for (const group of THEME_SCHEMA.groups) {
    const variable = group.variables.find((v) => v.key === key);
    if (variable) return variable;
  }
  return undefined;
}

/**
 * 将主题值应用到 DOM（覆盖 CSS 变量）
 */
export function applyThemeValues(values: Record<string, string | number>): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(values)) {
    const cssVar = `--${key}`;
    root.style.setProperty(cssVar, String(value));
  }
}

/**
 * 清除所有自定义主题值（恢复 CSS 默认）
 */
export function clearThemeValues(): void {
  const root = document.documentElement;
  for (const group of THEME_SCHEMA.groups) {
    for (const variable of group.variables) {
      root.style.removeProperty(`--${variable.key}`);
    }
  }
}

/**
 * 导出主题为 JSON
 */
export function exportThemeToJSON(
  name: string,
  values: Record<string, string | number>
): string {
  return JSON.stringify(
    {
      name,
      version: THEME_SCHEMA.version,
      values,
    },
    null,
    2
  );
}

/**
 * 从 JSON 导入主题
 */
export function importThemeFromJSON(json: string): {
  name: string;
  values: Record<string, string | number>;
} | null {
  try {
    const data = JSON.parse(json);
    if (!data.name || !data.values) return null;
    return { name: data.name, values: data.values };
  } catch {
    return null;
  }
}

/**
 * 切换系统主题（设置 data-os-theme 属性）
 */
export function setSystemTheme(themeId: PresetSkinId): void {
  document.documentElement.setAttribute("data-os-theme", themeId);
}

/**
 * 获取当前系统主题
 */
export function getCurrentSystemTheme(): PresetSkinId {
  const attr = document.documentElement.getAttribute("data-os-theme");
  if (attr && PRESET_SKINS.some(s => s.themeAttribute === attr)) {
    return attr as PresetSkinId;
  }
  return "macosx";
}
