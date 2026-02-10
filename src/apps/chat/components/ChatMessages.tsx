/**
 * [INPUT]: 依赖 react 的 useEffect/useRef
 * [OUTPUT]: 对外提供 ChatMessages 组件
 * [POS]: apps/chat/components 的消息列表组件，iMessage 风格设计
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";

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

function formatDate(timestamp: number, locale: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday =
    date.toDateString() ===
    new Date(now.getTime() - 86400000).toDateString();

  if (isToday) {
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (isYesterday) {
    return locale.startsWith("zh")
      ? "昨天"
      : locale.startsWith("ja")
      ? "昨日"
      : locale.startsWith("ko")
      ? "어제"
      : "Yesterday";
  }

  // 同年份只显示月日
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
  }

  // 不同年份显示完整日期
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(timestamp: number, locale: string): string {
  return new Date(timestamp).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================================
// 消息分组（按日期）
// ============================================================================

interface MessageGroup {
  date: string;
  messages: Message[];
}

function groupMessagesByDate(
  messages: Message[],
  locale: string
): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  for (const msg of messages) {
    const timestamp = msg.timestamp || Date.now();
    const dateStr = formatDate(timestamp, locale);

    if (!currentGroup || currentGroup.date !== dateStr) {
      currentGroup = { date: dateStr, messages: [] };
      groups.push(currentGroup);
    }
    currentGroup.messages.push(msg);
  }

  return groups;
}

// ============================================================================
// 组件
// ============================================================================

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const { t, i18n } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const locale = i18n.language || "zh-TW";

  // 按日期分组消息
  const messageGroups = useMemo(
    () => groupMessagesByDate(messages, locale),
    [messages, locale]
  );

  // -------------------------------------------------------------------------
  // 自动滚动到底部
  // -------------------------------------------------------------------------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // -------------------------------------------------------------------------
  // 渲染
  // -------------------------------------------------------------------------

  return (
    <div className="h-full overflow-y-auto">
      {/* 空状态 */}
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-[var(--os-color-text-secondary)] px-8">
          <div className="text-4xl mb-4 opacity-50">💬</div>
          <div className="text-sm font-geneva-12 text-center">
            {t("apps.chat.emptyState", "开始对话...")}
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="px-4 py-3 space-y-4">
        {messageGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-3">
            {/* 日期分隔符 */}
            <div className="flex justify-center">
              <span className="text-[10px] text-[var(--os-color-text-secondary)] font-geneva-12 bg-[var(--os-color-window-bg)]/80 px-3 py-1 rounded-full">
                {group.date}
              </span>
            </div>

            {/* 消息组 */}
            {group.messages.map((message, msgIndex) => {
              const isUser = message.role === "user";
              const showTime =
                msgIndex === group.messages.length - 1 ||
                group.messages[msgIndex + 1]?.role !== message.role;

              return (
                <div key={message.id} className="space-y-0.5">
                  {/* 消息气泡 */}
                  <div
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`
                        max-w-[75%] px-3 py-2 text-[13px] leading-relaxed
                        ${
                          isUser
                            ? "bg-[#fef08a] text-black rounded-[18px] rounded-br-[4px]"
                            : "bg-[#e0e7ff] text-black rounded-[18px] rounded-bl-[4px]"
                        }
                        shadow-sm
                      `}
                    >
                      <div className="whitespace-pre-wrap break-words font-geneva-12">
                        {message.content}
                      </div>
                    </div>
                  </div>

                  {/* 时间戳 - 只在连续消息的最后一条显示 */}
                  {showTime && message.timestamp && (
                    <div
                      className={`flex ${isUser ? "justify-end" : "justify-start"} px-1`}
                    >
                      <span className="text-[10px] text-[var(--os-color-text-secondary)]/60 font-geneva-12">
                        {formatTime(message.timestamp, locale)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* 加载动画 */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#e0e7ff] px-4 py-3 rounded-[18px] rounded-bl-[4px] shadow-sm">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
