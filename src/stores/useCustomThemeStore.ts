/**
 * [INPUT]: zustand + zustand/middleware(persist), @/themes/themeSchema
 * [OUTPUT]: useCustomThemeStore, CustomTheme, ThemeValues
 * [POS]: 自定义主题的状态管理，与 themes.css 配合实现主题定制
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 * 
 * 架构说明：
 * 1. themes.css 定义基础主题（通过 data-os-theme 属性切换）
 * 2. 本 store 管理用户自定义的覆盖值（通过 CSS 变量内联样式覆盖）
 * 3. Theme Editor 只保存用户修改的变量，不保存完整主题
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  PRESET_SKINS,
  applyThemeValues,
  clearThemeValues,
  getCurrentSystemTheme,
  getComputedThemeValue,
  type PresetSkinId,
} from "@/themes/themeSchema";

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

export type ThemeValues = Record<string, string | number>;

export interface CustomTheme {
  id: string;
  name: string;
  /** 基于哪个系统主题（对应 data-os-theme 值） */
  baseTheme: PresetSkinId;
  /** 用户自定义的覆盖值（只存储修改过的变量） */
  overrides: ThemeValues;
  createdAt: number;
  updatedAt: number;
}

// ─── Store 接口 ──────────────────────────────────────────────────────────────

interface CustomThemeStore {
  // ═══════════════════════════════════════════════════════════════════════════
  // 持久化状态
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** 保存的自定义主题列表 */
  themes: CustomTheme[];
  /** 当前激活的自定义主题 ID（null 表示使用系统默认） */
  activeThemeId: string | null;

  // ═══════════════════════════════════════════════════════════════════════════
  // 编辑器临时状态
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** 编辑器当前基础主题 */
  editorBaseTheme: PresetSkinId;
  /** 编辑器自定义覆盖值 */
  editorOverrides: ThemeValues;
  /** 当前编辑的主题 ID（null 表示新建） */
  editingThemeId: string | null;

  // ═══════════════════════════════════════════════════════════════════════════
  // Actions: 系统主题
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** 切换系统主题（设置 data-os-theme） */
  setBaseTheme: (theme: PresetSkinId) => Promise<void>;
  /** 获取当前系统主题 */
  getBaseTheme: () => PresetSkinId;

  // ═══════════════════════════════════════════════════════════════════════════
  // Actions: 编辑器操作
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** 更新单个变量 */
  updateVariable: (key: string, value: string | number) => void;
  /** 批量更新变量 */
  updateVariables: (values: ThemeValues) => void;
  /** 重置编辑器到默认状态 */
  resetEditor: () => void;
  /** 重置单个变量到默认值 */
  resetVariable: (key: string) => void;
  /** 应用预设皮肤（切换系统主题 + 清除覆盖 + 壁纸联动） */
  applyPresetSkin: (skinId: PresetSkinId) => Promise<void>;

  // ═══════════════════════════════════════════════════════════════════════════
  // Actions: 主题管理
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** 保存当前编辑为新主题 */
  saveAsNewTheme: (name: string) => string;
  /** 更新现有主题 */
  updateExistingTheme: (id: string, name?: string) => void;
  /** 删除主题 */
  deleteTheme: (id: string) => void;
  /** 加载主题到编辑器（不触发壁纸联动） */
  loadToEditor: (id: string) => Promise<void>;
  /** 激活主题（应用到全局 + 壁纸联动） */
  activateTheme: (id: string | null) => Promise<void>;

  // ═══════════════════════════════════════════════════════════════════════════
  // Actions: 导入/导出
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** 导出主题为 JSON */
  exportTheme: (name: string) => string;
  /** 从 JSON 导入主题到编辑器 */
  importTheme: (json: string) => Promise<boolean>;

  // ═══════════════════════════════════════════════════════════════════════════
  // Computed Helpers
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** 获取某个变量的当前值（考虑覆盖） */
  getVariableValue: (key: string) => string | number;
  /** 检查变量是否被自定义 */
  isVariableCustomized: (key: string) => boolean;
  /** 实时预览（应用覆盖到 DOM） */
  previewChanges: () => void;
}

// ─── 辅助函数 ─────────────────────────────────────────────────────────────────

const generateId = () => `theme_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ─── Store 实现 ──────────────────────────────────────────────────────────────

export const useCustomThemeStore = create<CustomThemeStore>()(
  persist(
    (set, get) => ({
      // 持久化状态
      themes: [],
      activeThemeId: null,

      // 编辑器临时状态
      editorBaseTheme: "macosx",
      editorOverrides: {},
      editingThemeId: null,

      // ─────────────────────────────────────────────────────────────────────
      // 系统主题
      // ─────────────────────────────────────────────────────────────────────

      setBaseTheme: async (theme) => {
        // 通过 useThemeStore 切换（触发壁纸联动）
        const { useThemeStore } = await import("./useThemeStore");
        useThemeStore.getState().setTheme(theme);
        set({ editorBaseTheme: theme });
      },

      getBaseTheme: () => getCurrentSystemTheme(),

      // ─────────────────────────────────────────────────────────────────────
      // 编辑器操作
      // ─────────────────────────────────────────────────────────────────────

      updateVariable: (key, value) => {
        set((s) => ({
          editorOverrides: { ...s.editorOverrides, [key]: value },
        }));
        get().previewChanges();
      },

      updateVariables: (values) => {
        set((s) => ({
          editorOverrides: { ...s.editorOverrides, ...values },
        }));
        get().previewChanges();
      },

      resetEditor: () => {
        set({ editorOverrides: {}, editingThemeId: null });
        clearThemeValues();
      },

      resetVariable: (key) => {
        set((s) => {
          const { [key]: _, ...rest } = s.editorOverrides;
          return { editorOverrides: rest };
        });
        get().previewChanges();
      },

      applyPresetSkin: async (skinId) => {
        // 通过 useThemeStore 切换主题（触发壁纸联动）
        const { useThemeStore } = await import("./useThemeStore");
        useThemeStore.getState().setTheme(skinId);
        // 清除所有覆盖
        clearThemeValues();
        // 更新编辑器状态
        set({ 
          editorBaseTheme: skinId, 
          editorOverrides: {},
          editingThemeId: null,
        });
      },

      // ─────────────────────────────────────────────────────────────────────
      // 主题管理
      // ─────────────────────────────────────────────────────────────────────

      saveAsNewTheme: (name) => {
        const id = generateId();
        const now = Date.now();
        const newTheme: CustomTheme = {
          id,
          name,
          baseTheme: get().editorBaseTheme,
          overrides: { ...get().editorOverrides },
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          themes: [...s.themes, newTheme],
          editingThemeId: id,
        }));
        return id;
      },

      updateExistingTheme: (id, name) => {
        set((s) => ({
          themes: s.themes.map((t) =>
            t.id === id
              ? {
                  ...t,
                  name: name ?? t.name,
                  baseTheme: s.editorBaseTheme,
                  overrides: { ...s.editorOverrides },
                  updatedAt: Date.now(),
                }
              : t
          ),
        }));
      },

      deleteTheme: (id) => {
        set((s) => ({
          themes: s.themes.filter((t) => t.id !== id),
          activeThemeId: s.activeThemeId === id ? null : s.activeThemeId,
          editingThemeId: s.editingThemeId === id ? null : s.editingThemeId,
        }));
      },

      loadToEditor: async (id) => {
        const theme = get().themes.find((t) => t.id === id);
        if (theme) {
          // 切换系统主题（不触发壁纸联动，编辑器场景）
          const { useThemeStore } = await import("./useThemeStore");
          useThemeStore.getState().setTheme(theme.baseTheme, { syncWallpaper: false });
          // 再应用覆盖
          applyThemeValues(theme.overrides);
          // 更新编辑器状态
          set({
            editorBaseTheme: theme.baseTheme,
            editorOverrides: { ...theme.overrides },
            editingThemeId: id,
          });
        }
      },

      activateTheme: async (id) => {
        set({ activeThemeId: id });
        if (id) {
          const theme = get().themes.find((t) => t.id === id);
          if (theme) {
            // 通过 useThemeStore 切换（触发壁纸联动）
            const { useThemeStore } = await import("./useThemeStore");
            useThemeStore.getState().setTheme(theme.baseTheme);
            applyThemeValues(theme.overrides);
          }
        } else {
          // 恢复默认：清除覆盖
          clearThemeValues();
        }
      },

      // ─────────────────────────────────────────────────────────────────────
      // 导入/导出
      // ─────────────────────────────────────────────────────────────────────

      exportTheme: (name) => {
        // 导出当前覆盖值 + 基础主题信息
        const data = {
          name,
          baseTheme: get().editorBaseTheme,
          overrides: get().editorOverrides,
        };
        return JSON.stringify(data, null, 2);
      },

      importTheme: async (json) => {
        try {
          const data = JSON.parse(json);
          if (!data.overrides) return false;
          
          // 如果有 baseTheme，切换到对应主题（不触发壁纸联动，导入场景）
          if (data.baseTheme && PRESET_SKINS.some(s => s.id === data.baseTheme)) {
            const { useThemeStore } = await import("./useThemeStore");
            useThemeStore.getState().setTheme(data.baseTheme, { syncWallpaper: false });
            set({ editorBaseTheme: data.baseTheme });
          }
          
          // 应用覆盖值
          set({ editorOverrides: data.overrides, editingThemeId: null });
          get().previewChanges();
          return true;
        } catch {
          return false;
        }
      },

      // ─────────────────────────────────────────────────────────────────────
      // Computed Helpers
      // ─────────────────────────────────────────────────────────────────────

      getVariableValue: (key) => {
        const overrides = get().editorOverrides;
        if (key in overrides) {
          return overrides[key];
        }
        // 从 DOM 读取当前 CSS 计算值（单一真相源）
        return getComputedThemeValue(key);
      },

      isVariableCustomized: (key) => {
        return key in get().editorOverrides;
      },

      previewChanges: () => {
        const overrides = get().editorOverrides;
        // 先清除所有自定义值，再应用当前覆盖
        clearThemeValues();
        if (Object.keys(overrides).length > 0) {
          applyThemeValues(overrides);
        }
      },
    }),
    {
      name: "custom-theme-store",
      version: 3,
      partialize: (state) => ({
        themes: state.themes,
        activeThemeId: state.activeThemeId,
        editorBaseTheme: state.editorBaseTheme,
      }),
    }
  )
);

// ─── 导出 Schema 引用 ─────────────────────────────────────────────────────────

export { THEME_SCHEMA, PRESET_SKINS } from "@/themes/themeSchema";
export type { PresetSkinId } from "@/themes/themeSchema";
