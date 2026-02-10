/**
 * [INPUT]: 依赖 react, framer-motion, use-stick-to-bottom
 * [OUTPUT]: 对外提供 ChatMessages 组件
 * [POS]: apps/chat/components 的消息列表组件，ryOS 风格设计
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { CaretDown, Copy, Check } from "@phosphor-icons/react";

import { useThemeStore } from "@/stores/useThemeStore";

// ============================================================================
// 类型定义
// ============================================================================

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

// ============================================================================
// 工具函数
// ============================================================================

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  // 不是今天，显示月日
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

// 检查是否只有 emoji
function isEmojiOnly(text: string): boolean {
  const emojiRegex = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u;
  return emojiRegex.test(text);
}

// ============================================================================
// 滚动到底部按钮
// ============================================================================

function ScrollToBottomButton({
  isAtBottom,
  onClick,
}: {
  isAtBottom: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const currentTheme = useThemeStore((s) => s.current);
  const isMacTheme = currentTheme === "macosx";

  return (
    <AnimatePresence>
      {!isAtBottom && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ type: "spring", duration: 0.2 }}
          className={`absolute bottom-2 right-3 rounded-full z-20 flex items-center justify-center cursor-pointer select-none ${
            isMacTheme ? "overflow-hidden" : ""
          }`}
          style={{
            width: 28,
            height: 28,
            background: isMacTheme
              ? "linear-gradient(rgba(160,160,160,0.625), rgba(255,255,255,0.625))"
              : "#ffffff",
            boxShadow: isMacTheme
              ? "0 2px 3px rgba(0,0,0,0.2), 0 1px 1px rgba(0,0,0,0.3), inset 0 0 0 0.5px rgba(0,0,0,0.3), inset 0 1px 2px rgba(0,0,0,0.4), inset 0 2px 3px 1px #bbbbbb"
              : "0 1px 2px rgba(0,0,0,0.25)",
            border: isMacTheme ? undefined : "1px solid rgba(0,0,0,0.3)",
            backdropFilter: isMacTheme ? "blur(2px)" : undefined,
          }}
          onClick={onClick}
          aria-label={t("apps.chat.scrollToBottom", "滚动到底部")}
        >
          {isMacTheme && (
            <>
              <div
                className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                style={{
                  top: "2px",
                  height: "30%",
                  width: "calc(100% - 12px)",
                  borderRadius: "12px 12px 4px 4px",
                  background:
                    "linear-gradient(rgba(255,255,255,0.9), rgba(255,255,255,0.25))",
                  filter: "blur(0.2px)",
                  zIndex: 2,
                }}
              />
              <div
                className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                style={{
                  bottom: "1px",
                  height: "38%",
                  width: "calc(100% - 4px)",
                  borderRadius: "4px 4px 8px 8px",
                  background:
                    "linear-gradient(rgba(255,255,255,0.15), rgba(255,255,255,0.55))",
                  filter: "blur(0.3px)",
                  zIndex: 1,
                }}
              />
            </>
          )}
          <CaretDown
            className={`h-2.5 w-2.5 ${
              isMacTheme ? "text-black/70 relative z-10" : "text-neutral-800"
            }`}
            weight="bold"
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export function ChatMessages({
  messages,
  isLoading,
}: ChatMessagesProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const currentTheme = useThemeStore((s) => s.current);

  // -------------------------------------------------------------------------
  // 滚动处理
  // -------------------------------------------------------------------------

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // 只有当内容可滚动时才判断是否在底部
      const isScrollable = scrollHeight > clientHeight;
      const nearBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsAtBottom(!isScrollable || nearBottom);
    }
  };

  // 自动滚动到底部
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  // -------------------------------------------------------------------------
  // 复制消息
  // -------------------------------------------------------------------------

  const copyMessage = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      console.error("Failed to copy message");
    }
  };

  // -------------------------------------------------------------------------
  // 渲染
  // -------------------------------------------------------------------------

  return (
    <div className="relative h-full flex flex-col">
      {/* 消息滚动区域 */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2"
      >


        {/* 消息列表 */}
        <AnimatePresence initial={false} mode="sync">
          {messages.map((message) => {
            const isUser = message.role === "user";
            const messageKey = message.id;
            const bgColorClass = isUser
              ? "bg-yellow-100 text-black"
              : "bg-blue-100 text-black";

            return (
              <motion.div
                key={messageKey}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={`flex flex-col w-full mb-2 ${
                  isUser ? "items-end" : "items-start"
                }`}
                onMouseEnter={() => setHoveredMessageId(messageKey)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                {/* 元信息：用户名 + 时间 + 操作按钮 */}
                <div
                  className={`${
                    currentTheme === "macosx" ? "text-[10px]" : "text-[11px]"
                  } text-gray-500 mb-0.5 font-geneva-12 flex items-center gap-2`}
                >
                  {isUser && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: hoveredMessageId === messageKey ? 1 : 0,
                        scale: 1,
                      }}
                      className="h-3 w-3 text-gray-400 hover:text-neutral-600 transition-colors"
                      onClick={() => copyMessage(message)}
                      aria-label={t("apps.chat.copyMessage", "复制消息")}
                    >
                      {copiedMessageId === messageKey ? (
                        <Check className="h-3 w-3" weight="bold" />
                      ) : (
                        <Copy className="h-3 w-3" weight="bold" />
                      )}
                    </motion.button>
                  )}
                  <span>{isUser ? t("apps.chat.you", "你") : "Kyo"}</span>
                  <span className="text-gray-400">
                    {message.timestamp ? formatTime(message.timestamp) : "..."}
                  </span>
                  {!isUser && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: hoveredMessageId === messageKey ? 1 : 0,
                        scale: 1,
                      }}
                      className="h-3 w-3 text-gray-400 hover:text-neutral-600 transition-colors"
                      onClick={() => copyMessage(message)}
                      aria-label={t("apps.chat.copyMessage", "复制消息")}
                    >
                      {copiedMessageId === messageKey ? (
                        <Check className="h-3 w-3" weight="bold" />
                      ) : (
                        <Copy className="h-3 w-3" weight="bold" />
                      )}
                    </motion.button>
                  )}
                </div>

                {/* 消息气泡 */}
                <motion.div
                  className={`p-1.5 px-2 chat-bubble ${bgColorClass} w-fit max-w-[85%] min-h-[12px] rounded leading-snug font-geneva-12 break-words select-text ${
                    isEmojiOnly(message.content) ? "text-[24px]" : "text-[13px]"
                  }`}
                >
                  <div className="whitespace-pre-wrap select-text">
                    {message.content}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* 加载动画 */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-start mb-2"
            >
              <div className="text-[10px] text-gray-500 mb-0.5 font-geneva-12 flex items-center gap-2">
                <span>Kyo</span>
                <span className="text-gray-400">...</span>
              </div>
              <div className="p-1.5 px-3 chat-bubble bg-blue-100 rounded">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 滚动到底部按钮 */}
      <ScrollToBottomButton isAtBottom={isAtBottom} onClick={scrollToBottom} />
    </div>
  );
}
