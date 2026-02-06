/**
 * [STUB] 空壳 store —— Finder 已移除
 */

import { create } from "zustand";

interface FinderStore {
  instances: Record<string, unknown>;
}

export const useFinderStore = create<FinderStore>()(() => ({
  instances: {},
}));
