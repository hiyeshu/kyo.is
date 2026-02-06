/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: appMetadata, helpItems
 * [POS]: bookmark-board 的元数据，被 appRegistry 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const helpItems = [
  {
    icon: "🔖",
    title: "Bookmarks",
    description: "Click any bookmark to open it in a new tab.",
  },
  {
    icon: "📁",
    title: "Folders",
    description: "Organize bookmarks into folders for easy access.",
  },
  {
    icon: "🔍",
    title: "Search",
    description: "Use the search bar to quickly find bookmarks.",
  },
  {
    icon: "➕",
    title: "Add Bookmark",
    description: "Click the + button or use File > Add Bookmark to add a new site.",
  },
];

export const appMetadata = {
  version: "1.0",
  name: "Bookmark Board",
  creator: { name: "You", url: "" },
  github: "",
  icon: "/icons/default/ie.png",
};
