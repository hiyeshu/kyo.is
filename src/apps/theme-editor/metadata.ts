/**
 * [INPUT]: 无
 * [OUTPUT]: appMetadata, helpItems
 * [POS]: theme-editor 应用元数据
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const appMetadata = {
  name: "Theme Editor",
  version: "1.0",
  creator: { name: "Kyo", url: "https://kyo.is" },
  github: "https://github.com/mrhyeshu/kyo.is",
  icon: "/icons/macosx/desktop.png",
};

export const helpItems = [
  {
    icon: "🎨",
    title: "Customize Colors",
    description: "Change window backgrounds, selection colors, and text colors.",
  },
  {
    icon: "📐",
    title: "Adjust Metrics",
    description: "Modify border radius, border width, and shadow effects.",
  },
  {
    icon: "💾",
    title: "Save Themes",
    description: "Save your custom themes and switch between them anytime.",
  },
  {
    icon: "🔄",
    title: "Base Themes",
    description: "Start from macOS, Windows XP, or Windows 98 as a base.",
  },
];
