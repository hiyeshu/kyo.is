/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: appMetadata, helpItems
 * [POS]: favorites 应用元数据，被 appRegistry 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const appMetadata = {
  name: "Collection Box",
  version: "1.0.0",
  creator: {
    name: "yeshu",
    url: "https://github.com/hiyeshu",
  },
  github: "https://github.com/hiyeshu/kyo.is",
  icon: "/icons/macosx/bento.png",
};

export const helpItems = [
  {
    icon: "⭐",
    title: "All Items",
    description: "View all your bookmarks and notes in one place",
  },
  {
    icon: "🔍",
    title: "Search",
    description: "Search across all your saved items",
  },
];
