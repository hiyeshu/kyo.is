/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 appMetadata, helpItems
 * [POS]: apps/control-panels/ 的元数据，被 index.ts 导出
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const appMetadata = {
  name: "System Preferences",
  version: "1.0.0",
  creator: {
    name: "Kyo",
    url: "https://kyo.is",
  },
  github: "https://github.com/mrhyeshu/kyo.is",
  description: "Configure wallpaper, sound, and system settings",
  icon: "/icons/macosx/control-panels/appearance-manager/app.png",
};

export const helpItems = [
  {
    icon: "🎨",
    title: "Appearance",
    description: "Change wallpaper and display mode",
  },
  {
    icon: "🔊",
    title: "Sound",
    description: "Adjust system volume and UI sounds",
  },
  {
    icon: "⚙️",
    title: "System",
    description: "Backup, restore, and reset system settings",
  },
];
