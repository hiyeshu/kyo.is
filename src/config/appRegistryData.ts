/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: appIds, AppId, AppBasicInfo, appNames, getAppBasicInfoList
 * [POS]: 轻量级应用 ID 注册表，被 store 和 appRegistry 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// Kyo.is only has 2 apps (Finder and Applet Viewer removed)
export const appIds = ["bookmarks", "theme-editor"] as const;

export type AppId = (typeof appIds)[number];

export interface AppBasicInfo {
  id: AppId;
  name: string;
}

export const appNames: Record<AppId, string> = {
  "bookmarks": "Bookmarks",
  "theme-editor": "Theme Editor",
};

export function getAppBasicInfoList(): AppBasicInfo[] {
  return appIds.map((id) => ({ id, name: appNames[id] }));
}
