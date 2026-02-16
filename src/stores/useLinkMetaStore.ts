/**
 * [INPUT]: 依赖 zustand + persist 中间件
 * [OUTPUT]: useLinkMetaStore — get / set / has LinkMeta 缓存
 * [POS]: stores/ 的网页元数据缓存层，被 usePasteHandler 和 chatTools 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LinkMeta } from "@/types/kyoItem";

interface LinkMetaState {
  cache: Record<string, LinkMeta>;
  get: (url: string) => LinkMeta | undefined;
  set: (url: string, meta: LinkMeta) => void;
  has: (url: string) => boolean;
}

export const useLinkMetaStore = create<LinkMetaState>()(
  persist(
    (set, get) => ({
      cache: {},

      get: (url) => get().cache[url],

      set: (url, meta) =>
        set((state) => ({
          cache: { ...state.cache, [url]: meta },
        })),

      has: (url) => url in get().cache,
    }),
    {
      name: "kyo:linkmeta-store",
    }
  )
);
