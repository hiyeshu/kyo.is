/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: appIds, AppId, AppBasicInfo, getAppBasicInfoList
 * [POS]: 轻量级应用 ID 注册表，被 store 和 appRegistry 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// Kyo.is apps (Finder and Applet Viewer removed)
export const appIds = ["bookmarks", "chat", "control-panels", "history", "stickies", "terminal", "white-noise"] as const;

export type AppId = (typeof appIds)[number];

export interface AppBasicInfo {
  id: AppId;
}

export function getAppBasicInfoList(): AppBasicInfo[] {
  return appIds.map((id) => ({ id }));
}
