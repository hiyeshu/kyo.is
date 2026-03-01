/**
 * [INPUT]: 无外部依赖，纯计算逻辑
 * [OUTPUT]: 对外提供 useDesktopGrid hook，计算移动端桌面图标的网格分页
 * [POS]: hooks/ 的移动端桌面网格计算器，被 MobileDesktopGrid.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useMemo } from "react";

// ─── 网格常量 ─────────────────────────────────────────────────────────
// 单元格尺寸：匹配 DesktopIcon 的 96px 宽 × 100px 高
const CELL_WIDTH = 96;
const CELL_HEIGHT = 100;
// 布局间距：与 MobileDesktopGrid 的 CSS 保持同构
const GRID_PAD_TOP = 8;
const GAP_Y = 12;
const MIN_COLS = 3;
const MAX_COLS = 5;
const MIN_ROWS = 3;
const MAX_ROWS = 5;

// ─── 类型 ─────────────────────────────────────────────────────────────

export interface DesktopGridItem {
  id: string;
  type: "app" | "bookmark";
}

export interface GridConfig {
  columns: number;
  rows: number;
  iconsPerPage: number;
  totalPages: number;
  pages: DesktopGridItem[][];
}

// ─── 工具函数 ─────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result.length > 0 ? result : [[]];
}

// ─── Hook ─────────────────────────────────────────────────────────────

export function useDesktopGrid(
  items: DesktopGridItem[],
  containerWidth: number,
  containerHeight: number
): GridConfig {
  return useMemo(() => {
    const columns = clamp(Math.floor(containerWidth / CELL_WIDTH), MIN_COLS, MAX_COLS);
    // 真实可用高度扣除网格顶部内边距
    // N 行 = N × CELL_HEIGHT + (N-1) × GAP_Y，解出 N:
    const usable = containerHeight - GRID_PAD_TOP;
    const rows = clamp(
      Math.floor((usable + GAP_Y) / (CELL_HEIGHT + GAP_Y)),
      MIN_ROWS,
      MAX_ROWS
    );
    const iconsPerPage = columns * rows;
    const pages = chunk(items, iconsPerPage);
    const totalPages = pages.length;

    return { columns, rows, iconsPerPage, totalPages, pages };
  }, [items, containerWidth, containerHeight]);
}
