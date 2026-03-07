/**
 * [INPUT]: 无
 * [OUTPUT]: 导出 Terminal 应用元数据
 * [POS]: apps/terminal 的元数据配置
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */

export const terminalMetadata = {
  version: "1.0.0",
  name: "终端",
  creator: { name: "Kyo", url: "https://kyo.is" },
  github: "https://github.com/hiyeshu/kyo.is",
  icon: "/icons/macosx/terminal.png",
};

export const helpItems = [
  {
    icon: "💻",
    title: "Basic Commands",
    description: "help, clear, echo, date, whoami, version, theme",
  },
  {
    icon: "🔖",
    title: "Kyo Commands",
    description: "bookmarks - List all bookmarks, stickies - List all notes",
  },
  {
    icon: "⌨️",
    title: "Keyboard Shortcuts",
    description: "↑/↓ - Navigate history, Tab - Auto-complete, Enter - Execute",
  },
];
