/**
 * [INPUT]: 依赖 React hooks, Framer Motion, WindowFrame, i18next, useThemeStore, useBookmarkStore, useStickiesStore
 * [OUTPUT]: 对外提供 TerminalApp 组件
 * [POS]: apps/terminal 的主界面组件,模拟终端环境,保留 ryos 原版样式,支持国际化
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { useThemeStore } from "@/stores/useThemeStore";
import { useBookmarkStore } from "@/stores/useBookmarkStore";
import { useStickiesStore } from "@/stores/useStickiesStore";
import type { AppProps } from "@/apps/base/types";

interface TerminalLine {
  id: string;
  type: "input" | "output" | "error" | "success";
  content: string;
}

const WELCOME_ASCII = `
    __  __
   / /_/ /_  ______
  / //_/ / / / / __ \\
 / ,< / /_/ / /_/ /
/_/|_|\\__, /\\____/
     /____/
`;

export function TerminalApp(props: AppProps<unknown>) {
  const { t } = useTranslation();
  const currentTheme = useThemeStore((s) => s.current);
  const bookmarks = useBookmarkStore((s) => s.items);
  const stickies = useStickiesStore((s) => s.notes);

  const [lines, setLines] = useState<TerminalLine[]>([
    { id: "welcome", type: "output", content: WELCOME_ASCII },
    { id: "welcome-version", type: "output", content: "Kyo Terminal v1.0.0" },
    { id: "welcome-help", type: "output", content: t("apps.terminal.welcome", '输入 "help" 查看可用命令') },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentPath] = useState("/");
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  // 点击终端聚焦输入框 (但不干扰文字选择)
  const handleTerminalClick = (e: React.MouseEvent) => {
    // 如果用户正在选择文字,不要聚焦输入框
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }

    // 如果点击的是输入框本身,不需要再次聚焦
    if (e.target === inputRef.current) {
      return;
    }

    inputRef.current?.focus();
  };

  // 执行命令
  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) {
      setLines((prev) => [
        ...prev,
        { id: Date.now().toString(), type: "input", content: `→ ${currentPath}` },
      ]);
      return;
    }

    // 添加输入行
    setLines((prev) => [
      ...prev,
      { id: `input-${Date.now()}`, type: "input", content: `→ ${currentPath} ${trimmed}` },
    ]);

    // 添加到历史 (用于上下箭头导航)
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    // 解析命令
    const [command, ...args] = trimmed.split(" ");
    const output = processCommand(command.toLowerCase(), args);

    // 添加输出
    setLines((prev) => [
      ...prev,
      ...output.map((line, i) => ({
        id: `output-${Date.now()}-${i}`,
        type: line.type,
        content: line.content,
      })),
    ]);

    setInput("");
  };

  // 处理命令
  const processCommand = (
    cmd: string,
    args: string[]
  ): Array<{ type: "output" | "error" | "success"; content: string }> => {
    switch (cmd) {
      case "help":
        return [
          { type: "output", content: t("apps.terminal.output.availableCommands", "可用命令:") },
          { type: "success", content: `  help           - ${t("apps.terminal.commands.help", "显示可用命令")}` },
          { type: "success", content: `  clear          - ${t("apps.terminal.commands.clear", "清空终端")}` },
          { type: "success", content: `  echo <text>    - ${t("apps.terminal.commands.echo", "输出文本")}` },
          { type: "success", content: `  date           - ${t("apps.terminal.commands.date", "显示当前日期时间")}` },
          { type: "success", content: `  whoami         - ${t("apps.terminal.commands.whoami", "显示当前用户")}` },
          { type: "success", content: `  bookmarks      - ${t("apps.terminal.commands.bookmarks", "列出所有书签")}` },
          { type: "success", content: `  stickies       - ${t("apps.terminal.commands.stickies", "列出所有便签")}` },
          { type: "success", content: `  theme          - ${t("apps.terminal.commands.theme", "显示当前主题")}` },
          { type: "success", content: `  version        - ${t("apps.terminal.commands.version", "显示 Kyo 版本")}` },
          { type: "success", content: `  open <name>    - ${t("apps.terminal.commands.open", "打开书签")}` },
        ];

      case "clear":
        setLines([]);
        return [];

      case "echo":
        return [{ type: "output", content: args.join(" ") }];

      case "date":
        return [{ type: "output", content: new Date().toLocaleString() }];

      case "whoami":
        return [{ type: "output", content: "kyo-user" }];

      case "bookmarks":
        if (bookmarks.length === 0) {
          return [{ type: "output", content: t("apps.terminal.output.noBookmarks", "暂无书签") }];
        }
        return [
          { type: "output", content: t("apps.terminal.output.totalBookmarks", "共 {{count}} 个书签:", { count: bookmarks.length }) },
          { type: "output", content: "" },
          ...bookmarks.slice(0, 10).map((b) => ({
            type: "output" as const,
            content: `  • ${b.title} - ${b.url}`,
          })),
          ...(bookmarks.length > 10
            ? [{ type: "output" as const, content: `  ${t("apps.terminal.output.andMore", "... 还有 {{count}} 个", { count: bookmarks.length - 10 })}` }]
            : []),
        ];

      case "stickies":
        if (stickies.length === 0) {
          return [{ type: "output", content: t("apps.terminal.output.noStickies", "暂无便签") }];
        }
        return [
          { type: "output", content: t("apps.terminal.output.totalStickies", "共 {{count}} 个便签:", { count: stickies.length }) },
          { type: "output", content: "" },
          ...stickies.slice(0, 5).map((n) => ({
            type: "output" as const,
            content: `  • ${n.content.substring(0, 50)}${n.content.length > 50 ? "..." : ""}`,
          })),
          ...(stickies.length > 5
            ? [{ type: "output" as const, content: `  ${t("apps.terminal.output.andMore", "... 还有 {{count}} 个", { count: stickies.length - 5 })}` }]
            : []),
        ];

      case "open":
        if (args.length === 0) {
          return [{ type: "error", content: t("apps.terminal.output.usageOpen", "用法: open <书签名称>") }];
        }
        const searchTerm = args.join(" ").toLowerCase();
        const bookmark = bookmarks.find((b) => b.title.toLowerCase().includes(searchTerm));
        if (bookmark) {
          window.open(bookmark.url, "_blank");
          return [{ type: "success", content: t("apps.terminal.output.opening", "正在打开: {{name}}", { name: bookmark.title }) }];
        }
        return [{ type: "error", content: t("apps.terminal.output.bookmarkNotFound", "未找到书签: {{name}}", { name: searchTerm }) }];

      case "theme":
        return [{ type: "output", content: t("apps.terminal.output.currentTheme", "当前主题: {{theme}}", { theme: currentTheme }) }];

      case "version":
        return [
          { type: "output", content: "Kyo.is v1.0.0" },
          { type: "output", content: t("apps.terminal.output.builtWith", "基于 React + TypeScript + Tauri 构建") },
        ];

      case "":
        return [];

      default:
        return [
          { type: "error", content: t("apps.terminal.output.commandNotFound", "命令未找到: {{cmd}}", { cmd }) },
          { type: "output", content: t("apps.terminal.output.typeHelpForCommands", '输入 "help" 查看可用命令') },
        ];
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
      const commands = ["help", "clear", "echo", "date", "whoami", "bookmarks", "stickies", "theme", "version", "open"];
      const matches = commands.filter((c) => c.startsWith(input.toLowerCase()));
      if (matches.length === 1) {
        setInput(matches[0]);
      }
    }
  };

  // Framer Motion 动画变体
  const lineVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
  };

  return (
    <WindowFrame
      appId="terminal"
      instanceId={props.instanceId}
      title="终端"
      isForeground={props.isForeground}
      onClose={props.onClose}
    >
      <div
        ref={terminalRef}
        onClick={handleTerminalClick}
        className="h-full w-full overflow-y-auto p-4 font-mono text-sm bg-black/90 backdrop-blur-xl cursor-text select-text"
        style={{ fontFamily: "'SF Mono', 'PingFang SC', 'Microsoft YaHei', Menlo, Monaco, 'Courier New', monospace" }}
      >
        {/* 历史输出 - 使用 Framer Motion 动画 */}
        <AnimatePresence mode="popLayout">
          {lines.map((line) => (
            <motion.div
              key={line.id}
              variants={lineVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="select-text"
              style={{
                whiteSpace: "pre-wrap",
                userSelect: "text",
                WebkitUserSelect: "text",
                fontWeight: line.type === "input" ? "bold" : "normal",
                fontSize: "0.875rem",
                lineHeight: "1.5",
                fontFamily: "'SF Mono', 'PingFang SC', 'Microsoft YaHei', Menlo, Monaco, 'Courier New', monospace",
                color:
                  line.type === "input"
                    ? "#4ade80" // 绿色 (输入)
                    : line.type === "error"
                      ? "#f87171" // 红色 (错误)
                      : line.type === "success"
                        ? "#86efac" // 浅绿色 (成功)
                        : "#d1d5db", // 灰色 (普通输出)
              }}
            >
              {line.content}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 当前输入行 */}
        <div className="flex items-center mt-2">
          <span className="mr-2 select-none" style={{
            color: "#4ade80",
            fontSize: "0.875rem",
            lineHeight: "1.5",
            fontFamily: "'SF Mono', 'PingFang SC', 'Microsoft YaHei', Menlo, Monaco, 'Courier New', monospace"
          }}>→ {currentPath}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 terminal-input"
            style={{
              background: "transparent !important",
              backgroundColor: "transparent !important",
              border: "none !important",
              outline: "none !important",
              color: "#86efac",
              caretColor: "#86efac",
              boxShadow: "none !important",
              fontSize: "0.875rem",
              lineHeight: "1.5",
              fontFamily: "'SF Mono', 'PingFang SC', 'Microsoft YaHei', Menlo, Monaco, 'Courier New', monospace",
              fontWeight: "normal"
            }}
            autoFocus
            spellCheck={false}
          />
        </div>
      </div>
    </WindowFrame>
  );
}

export default TerminalApp;
