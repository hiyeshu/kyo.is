/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: appMetadata, helpItems
 * [POS]: stickies 应用元数据，被 appRegistry 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const appMetadata = {
  name: "Stickies",
  version: "1.0.0",
  creator: {
    name: "Yeshu",
    url: "https://hiyeshu.com",
  },
  github: "https://github.com/hiyeshu/kyo.is",
  icon: "/icons/default/stickies.png",
};

export const helpItems = [
  {
    icon: "📝",
    title: "Create Note",
    description: "Click File > New Note to create a new sticky note",
  },
  {
    icon: "🎨",
    title: "Colors",
    description: "Change note colors from the Note menu to organize your thoughts",
  },
  {
    icon: "↔️",
    title: "Move & Resize",
    description: "Drag the title bar to move, drag the corner to resize notes",
  },
  {
    icon: "🗑️",
    title: "Delete Note",
    description: "Click the X button on a note to delete it",
  },
  {
    icon: "🧹",
    title: "Clear All",
    description: "Use File > Clear All Notes to remove all stickies at once",
  },
  {
    icon: "💾",
    title: "Auto-Save",
    description: "Notes are automatically saved and persist between sessions",
  },
];
