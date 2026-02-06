/**
 * App-specific initial data types (simplified).
 */

import type { AppId } from "@/config/appIds";

export interface AppInitialDataMap {
  // Add app-specific initialData types here as needed
}

export type AppInitialData<T extends AppId> = T extends keyof AppInitialDataMap
  ? AppInitialDataMap[T]
  : undefined;

export type AnyAppInitialData = undefined;
