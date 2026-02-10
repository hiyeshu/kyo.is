/**
 * [INPUT]: 依赖 react hooks，依赖 ../../base/types 的 AppProps
 * [OUTPUT]: 对外提供 ChatAppComponent 组件
 * [POS]: apps/chat/components 的主组件，实现聊天界面，对接 Dify Chatflow API
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { useTranslation } from "react-i18next";
import { ChatMessages, type Message } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { Trash } from "@phosphor-icons/react";

// ============================================================================
// 主组件
// ============================================================================

export function ChatAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
  skipInitialSound,
  instanceId,
  onNavigateNext,
  onNavigatePrevious,
}: AppProps) {
  const { t } = useTranslation();

  // -------------------------------------------------------------------------
  // 状态管理
  // -------------------------------------------------------------------------

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  // -------------------------------------------------------------------------
  // 清除聊天
  // -------------------------------------------------------------------------

  const handleClear = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  // -------------------------------------------------------------------------
  // 消息发送处理
  // -------------------------------------------------------------------------

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      const now = Date.now();
      const userMessage: Message = {
        id: `user-${now}`,
        role: "user",
        content: input.trim(),
        timestamp: now,
      };

      // 构建包含新消息的完整消息列表
      const updatedMessages = [...messages, userMessage];

      // 添加用户消息到列表
      setMessages(updatedMessages);
      setInput("");
      setIsLoading(true);

      // 创建新的 AbortController 用于取消请求
      const controller = new AbortController();
      setAbortController(controller);

      // 准备 AI 消息 ID（不立即添加到列表）
      const assistantMessageId = `assistant-${now}`;
      let hasAddedMessage = false;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            conversationId: conversationId,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        // 处理 SSE 流式响应
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullContent = "";
        const assistantTimestamp = Date.now();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line) continue;

            // AI SDK 格式: 0:"text" 表示文本增量
            if (line.startsWith("0:")) {
              try {
                const textDelta = JSON.parse(line.slice(2));
                fullContent += textDelta;

                // 第一次收到内容时才添加消息
                if (!hasAddedMessage) {
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: assistantMessageId,
                      role: "assistant",
                      content: fullContent,
                      timestamp: assistantTimestamp,
                    },
                  ]);
                  hasAddedMessage = true;
                } else {
                  // 后续更新消息内容
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: fullContent }
                        : m
                    )
                  );
                }
              } catch {
                // 忽略解析错误
              }
            }
            // d:{...} 表示完成信息，包含 conversationId
            else if (line.startsWith("d:")) {
              try {
                const data = JSON.parse(line.slice(2));
                if (data.conversationId) {
                  setConversationId(data.conversationId);
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          // 用户取消，不做处理
        } else {
          console.error("Chat error:", error);
          // 显示错误消息
          const errorTimestamp = Date.now();
          if (!hasAddedMessage) {
            setMessages((prev) => [
              ...prev,
              {
                id: assistantMessageId,
                role: "assistant",
                content: t("apps.chat.error", "抱歉，发生了错误，请重试。"),
                timestamp: errorTimestamp,
              },
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: t(
                        "apps.chat.error",
                        "抱歉，发生了错误，请重试。"
                      ),
                    }
                  : m
              )
            );
          }
        }
      } finally {
        setIsLoading(false);
        setAbortController(null);
      }
    },
    [input, isLoading, messages, conversationId, t]
  );

  // -------------------------------------------------------------------------
  // 停止生成
  // -------------------------------------------------------------------------

  const handleStop = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setIsLoading(false);
    }
  }, [abortController]);

  // -------------------------------------------------------------------------
  // 输入变化
  // -------------------------------------------------------------------------

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // -------------------------------------------------------------------------
  // 渲染
  // -------------------------------------------------------------------------

  if (!isWindowOpen) return null;

  return (
    <WindowFrame
      title={t("apps.chat.title", "聊天")}
      onClose={onClose}
      isForeground={isForeground}
      appId="chat"
      skipInitialSound={skipInitialSound}
      instanceId={instanceId}
      onNavigateNext={onNavigateNext}
      onNavigatePrevious={onNavigatePrevious}
    >
      <div className="flex flex-col h-full bg-[var(--os-color-window-bg)]">
        {/* 头部栏 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--os-color-border)] bg-[var(--os-color-window-bg)]/80 backdrop-blur-sm">
          {/* 左侧：今日日期 */}
          <div className="text-xs font-geneva-12 text-[var(--os-color-text-secondary)]">
            {new Date().toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              weekday: "short",
            })}
          </div>

          {/* 右侧：清除按钮 */}
          <button
            onClick={handleClear}
            disabled={messages.length === 0}
            className="flex items-center gap-1 text-xs font-geneva-12 text-[var(--os-color-text-secondary)] hover:text-[var(--os-color-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title={t("apps.chat.clear", "清除")}
          >
            <Trash className="w-3.5 h-3.5" />
            <span>{t("apps.chat.clear", "清除")}</span>
          </button>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-hidden">
          <ChatMessages messages={messages} isLoading={isLoading} />
        </div>

        {/* 输入区域 */}
        <div className="border-t border-[var(--os-color-border)] p-3 bg-[var(--os-color-window-bg)]/80 backdrop-blur-sm">
          <ChatInput
            input={input}
            isLoading={isLoading}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            onStop={handleStop}
          />
        </div>
      </div>
    </WindowFrame>
  );
}
