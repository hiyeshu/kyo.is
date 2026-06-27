/**
 * [INPUT]: 依赖 config/appIds 的 AppId
 * [OUTPUT]: AppInitialDataMap / AppInitialData / AnyAppInitialData 类型
 * [POS]: types/ 的应用启动数据契约，被窗口启动和 app registry 相关逻辑消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { AppId } from "@/config/appIds";

export type AppInitialDataMap = Record<never, never>;

export type AppInitialData<T extends AppId> = T extends keyof AppInitialDataMap
  ? AppInitialDataMap[T]
  : undefined;

export type AnyAppInitialData = undefined;
