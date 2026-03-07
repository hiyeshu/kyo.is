/**
 * [INPUT]: 依赖 React hooks, useThemeStore, useBookmarkStore, useStickiesStore
 * [OUTPUT]: 对外提供 TerminalApp 组件
 * [POS]: apps/terminal 的主界面组件,模拟终端环境
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useThemeStore } from "@/stores/useThemeStore";
import { useBookmarkStore } from "@/stores/useBookmarkStore";
import { useStickiesStore } from "@/stores/useStickiesStore";
import { useTranslation } from "react-i18next";

interface TerminalLine {
  type: "input" | "output" | "error";
  content: string;
}

interface TerminalAppProps {
  instanceId: string;
  appId: string;
}

export function TerminalApp({ instanceId, appId }: TerminalAppProps) {
  const { t } = useTranslation();
  const currentTheme = useThemeStore((s) => s.current);
  const bookmarks = useBookmarkStore((s) => s.items);
  const stickies = useStickiesStore((s) => s.notes);

  const [lines, setLines] = useState<TerminalLine[]>([
    { type: "output", content: "Kyo Terminal v1.0.0" },
    { type: "output", content: "Type 'help' for available commands." },
    { type: "output", content: "" },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  // 点击终端聚焦输入框
  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  // 执行命令
  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // 添加输入行
    setLines((prev) => [...prev, { type: "input", content: `$ ${trimmed}` }]);

    // 添加到历史
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    // 解析命令
    const [command, ...args] = trimmed.split(" ");
    const output = processCommand(command.toLowerCase(), args);

    // 添加输出
    setLines((prev) => [
      ...prev,
      ...output.map((line) => ({
        type: line.startsWith("Error:") ? ("error" as const) : ("output" as const),
        content: line,
      })),
      { type: "output" as const, content: "" },
    ]);

    setInput("");
  };

  // 处理命令
  const processCommand = (cmd: string, args: string[]): string[] => {
    switch (cmd) {
      case "help":
        return [
          "Available commands:",
          "  help           - Show this help message",
          "  clear          - Clear the terminal",
          "  echo <text>    - Print text",
          "  date           - Show current date and time",
          "  whoami         - Show current user",
          "  bookmarks      - List all bookmarks",
          "  stickies       - List all sticky notes",
          "  theme          - Show current theme",
          "  version        - Show Kyo version",
        ];

      case "clear":
        setLines([]);
        return [];

      case "echo":
        return [args.join(" ")];

      case "date":
        return [new Date().toString()];

      case "whoami":
        return ["kyo-user"];

      case "bookmarks":
        if (bookmarks.length === 0) {
          return ["No bookmarks found."];
        }
        return [
          `Total bookmarks: ${bookmarks.length}`,
          "",
          ...bookmarks.slice(0, 10).map((b) => `  • ${b.title} - ${b.url}`),
          bookmarks.length > 10 ? `  ... and ${bookmarks.length - 10} more` : "",
        ].filter(Boolean);

      case "stickies":
        if (stickies.length === 0) {
          return ["No sticky notes found."];
        }
        return [
          `Total notes: ${stickies.length}`,
          "",
          ...stickies.slice(0, 5).map((n) => `  • ${n.content.substring(0, 50)}${n.content.length > 50 ? "..." : ""}`),
          stickies.length > 5 ? `  ... and ${stickies.length - 5} more` : "",
        ].filter(Boolean);

      case "theme":
        return [`Current theme: ${currentTheme}`];

      case "version":
        return ["Kyo.is v1.0.0", "Built with React + TypeScript + Tauri"];

      case "":
        return [];

      default:
        return [`Error: Command not found: ${cmd}`, "Type 'help' for available commands."];
    }
  };

  // 键盘事件
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand(input);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= history.length) {
          setHistoryIndex(-1);
          setInput("");
        } else {
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        }
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      // 简单的命令补全
      const commands = ["help", "clear", "echo", "date", "whoami", "bookmarks", "stickies", "theme", "version"];
      const matches = commands.filter((c) => c.startsWith(input.toLowerCase()));
      if (matches.length === 1) {
        setInput(matches[0]);
      }
    }
  };

  // 主题样式
  const isMac = currentTheme === "macosx";
  const isXp = currentTheme === "xp";
  const isWin98 = currentTheme === "win98";

  const bgColor = isMac
    ? "bg-black/90 backdrop-blur-xl"
    : isXp
      ? "bg-[#0C0C0C]"
      : "bg-black";

  const textColor = isMac
    ? "text-green-400"
    : isXp
      ? "text-[#CCCCCC]"
      : "text-[#C0C0C0]";

  const inputColor = isMac
    ? "text-green-300"
    : isXp
      ? "text-white"
      : "text-white";

  return (
    <div
      ref={terminalRef}
      onClick={handleTerminalClick}
      className={`h-full w-full overflow-y-auto p-4 font-mono text-sm ${bgColor} ${textColor} cursor-text`}
      style={{ fontFamily: "Menlo, Monaco, 'Courier New', monospace" }}
    >
      {/* 历史输出 */}
      {lines.map((line, i) => (
        <div
          key={i}
          className={
            line.type === "input"
              ? "font-bold"
              : line.type === "error"
                ? "text-red-400"
                : ""
          }
        >
          {line.content}
        </div>
      ))}

      {/* 当前输入行 */}
      <div className="flex items-center">
        <span className="mr-2">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`flex-1 bg-transparent outline-none ${inputColor}`}
          autoFocus
          spellCheck={false}
        />
      </div>
    </div>
  );
}
