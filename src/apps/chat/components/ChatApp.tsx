/**
 * [INPUT]: 依赖 react hooks，依赖 ../../base/types 的 AppProps
 * [OUTPUT]: 对外提供 ChatAppComponent 组件
 * [POS]: apps/chat/components 的主组件，ryOS 风格设计，对接 Dify Chatflow API
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { useTranslation } from "react-i18next";
import { ChatMessages, type Message } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/useThemeStore";

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
  const currentTheme = useThemeStore((s) => s.current);
  const isMacTheme = currentTheme === "macosx";
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";

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

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      setIsLoading(true);

      const controller = new AbortController();
      setAbortController(controller);

      const assistantMessageId = `assistant-${now}`;
      let hasAddedMessage = false;

      try {
        console.log("[Chat] Sending request to /api/chat");
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

        console.log("[Chat] Response status:", response.status, response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Chat] Error response:", errorText);
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        console.log("[Chat] Reader:", reader ? "obtained" : "null");
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullContent = "";
        const assistantTimestamp = Date.now();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          console.log("[Chat] Raw chunk:", chunk);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line) continue;
            console.log("[Chat] Processing line:", line);

            if (line.startsWith("0:")) {
              try {
                const textDelta = JSON.parse(line.slice(2));
                fullContent += textDelta;

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
            } else if (line.startsWith("d:")) {
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
          // 用户取消
        } else {
          console.error("Chat error:", error);
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
      <div className="relative flex flex-col h-full w-full bg-white/85">
        {/* 头部栏 - ryOS 风格 */}
        <div
          className={`sticky top-0 z-10 flex items-center justify-between px-2 py-1 border-b ${
            isMacTheme ? "" : "bg-neutral-200/90 backdrop-blur-lg"
          } ${isXpTheme ? "border-[#919b9c]" : isMacTheme ? "" : "border-black"}`}
          style={{
            transform: "translateZ(0)",
            ...(isMacTheme
              ? {
                  backgroundImage: "var(--os-pinstripe-window)",
                  opacity: 0.95,
                  borderBottom:
                    "var(--os-metrics-titlebar-border-width, 1px) solid var(--os-color-titlebar-border-inactive, rgba(0, 0, 0, 0.2))",
                }
              : undefined),
          }}
        >
          {/* 左侧：日期 */}
          <div className="flex items-center px-2">
            <span className="font-geneva-12 text-[12px] text-neutral-600">
              {new Date().toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </span>
          </div>

          {/* 右侧：清除按钮 */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleClear}
              disabled={messages.length === 0}
              className="flex items-center gap-1 px-2 py-1 h-7"
            >
              <span className="font-geneva-12 text-[11px]">
                {t("apps.chat.clear", "清除")}
              </span>
            </Button>
          </div>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-hidden">
          <ChatMessages messages={messages} isLoading={isLoading} />
        </div>

        {/* 输入区域 */}
        <div
          className="p-2 z-10"
          style={{ width: "calc(100% - var(--sbw, 0px))" }}
        >
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
