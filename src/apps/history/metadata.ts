/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: appMetadata, helpItems
 * [POS]: history 应用元数据，被 appRegistry 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const appMetadata = {
  name: "History",
  version: "1.0.0",
  creator: {
    name: "yeshu",
    url: "https://github.com/hiyeshu",
  },
  github: "https://github.com/hiyeshu/kyo.is",
  icon: "/icons/macosx/minesweeper.png",
};

export const helpItems = [
  {
    icon: "🕐",
    title: "Timeline",
    description: "All your bookmarks and notes, organized by time",
  },
  {
    icon: "🔍",
    title: "Search",
    description: "Search across all history, including deleted items",
  },
];
