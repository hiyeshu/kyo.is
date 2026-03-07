/**
 * [INPUT]: 无
 * [OUTPUT]: 导出 Terminal 应用元数据
 * [POS]: apps/terminal 的元数据配置
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */

import type { AppMetadata } from "../base/types";

export const terminalMetadata: AppMetadata = {
  id: "terminal",
  name: "Terminal",
  version: "1.0.0",
  icon: "/icons/macosx/terminal.png",
  category: "utility",
  description: "Command-line interface for Kyo",
  helpItems: [
    {
      title: "Basic Commands",
      items: [
        { label: "help", description: "Show available commands" },
        { label: "clear", description: "Clear the terminal" },
        { label: "echo <text>", description: "Print text" },
      ],
    },
    {
      title: "System Commands",
      items: [
        { label: "date", description: "Show current date and time" },
        { label: "whoami", description: "Show current user" },
        { label: "version", description: "Show Kyo version" },
        { label: "theme", description: "Show current theme" },
      ],
    },
    {
      title: "Kyo Commands",
      items: [
        { label: "bookmarks", description: "List all bookmarks" },
        { label: "stickies", description: "List all sticky notes" },
      ],
    },
    {
      title: "Keyboard Shortcuts",
      items: [
        { label: "↑/↓", description: "Navigate command history" },
        { label: "Tab", description: "Auto-complete command" },
        { label: "Enter", description: "Execute command" },
      ],
    },
  ],
};
