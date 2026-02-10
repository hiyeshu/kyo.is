/**
 * [INPUT]: 依赖 react 的 useEffect/useRef
 * [OUTPUT]: 对外提供 ChatMessages 组件
 * [POS]: apps/chat/components 的消息列表组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

// ============================================================================
// 类型定义
// ============================================================================

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

// ============================================================================
// 组件
// ============================================================================

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    <div className="h-full overflow-y-auto p-4 space-y-3 bg-[var(--os-color-window-bg)]">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-[var(--os-color-text-secondary)] text-xs font-geneva-12">
          {t("apps.chat.emptyState", "开始对话...")}
        </div>
      )}

      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`chat-bubble font-geneva-12 text-xs leading-snug ${
              message.role === "user"
                ? "bg-yellow-100 text-black"
                : "bg-blue-100 text-black"
            }`}
          >
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="chat-bubble bg-blue-100 font-geneva-12 text-xs">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
