/**
 * [INPUT]: 依赖 react hooks，依赖 ../../base/types 的 AppProps
 * [OUTPUT]: 对外提供 ChatAppComponent 组件
 * [POS]: apps/chat/components 的主组件，对接 Dify Chatflow API，管理图片附件+autoSend（从 CommandPalette 等入口自动发送）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { useTranslation } from "react-i18next";
import { ChatMessages, type Message } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/useThemeStore";
import { detectIntent, executeIntent, getContextForIntent } from "../utils/chatTools";
import {
  preprocessImage,
  validateImageFile,
  type ImageAttachment,
} from "../utils/imagePreprocessing";

// ============================================================================
// 主组件
// ============================================================================

export function ChatAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
  skipInitialSound,
  initialData,
  instanceId,
  onNavigateNext,
  onNavigatePrevious,
}: AppProps) {
  const { t, i18n } = useTranslation();
  const currentTheme = useThemeStore((s) => s.current);
  const isMacTheme = currentTheme === "macosx";
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  const autoSendRef = useRef<string | null>(null);

  // -------------------------------------------------------------------------
  // 状态管理（session 级别，关窗即清）
  // -------------------------------------------------------------------------

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [pendingImages, setPendingImages] = useState<ImageAttachment[]>([]);

  // 清理旧版本遗留的 localStorage
  useEffect(() => {
    try {
      localStorage.removeItem("kyo.chat.session");
      localStorage.removeItem("kyo.chat.history");
    } catch { /* ignore */ }
  }, []);

  // -------------------------------------------------------------------------
  // autoSend：从 CommandPalette 等入口传入的自动发送
  // -------------------------------------------------------------------------

  useEffect(() => {
    const data = initialData as { autoSend?: string } | undefined;
    if (data?.autoSend) {
      setInput(data.autoSend);
      autoSendRef.current = data.autoSend;
    }
  }, [initialData]);

  // 监听 updateApp 事件（聊天窗口已打开时再次触发）
  useEffect(() => {
    const handleUpdate = (e: CustomEvent<{ appId: string; initialData: unknown }>) => {
      if (e.detail.appId !== "chat") return;
      const data = e.detail.initialData as { autoSend?: string } | undefined;
      if (data?.autoSend) {
        setInput(data.autoSend);
        autoSendRef.current = data.autoSend;
      }
    };
    window.addEventListener("updateApp", handleUpdate as EventListener);
    return () => window.removeEventListener("updateApp", handleUpdate as EventListener);
  }, []);

  // -------------------------------------------------------------------------
  // 图片处理
  // -------------------------------------------------------------------------

  const handleAddImages = useCallback(
    async (files: FileList) => {
      for (const file of Array.from(files)) {
        const error = validateImageFile(file);
        if (error === "too_large") {
          alert(t("apps.chat.imageTooLarge", "图片不能超过 10MB"));
          continue;
        }
        if (error) continue;
        try {
          const attachment = await preprocessImage(file);
          setPendingImages((prev) => [...prev, attachment]);
        } catch {
          console.error("Failed to preprocess image");
        }
      }
    },
    [t]
  );

  const handleRemoveImage = useCallback((id: string) => {
    setPendingImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  // -------------------------------------------------------------------------
  // 清除聊天
  // -------------------------------------------------------------------------

  const handleClear = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setPendingImages([]);
  }, []);

  // -------------------------------------------------------------------------
  // 消息发送处理
  // -------------------------------------------------------------------------

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const hasImages = pendingImages.length > 0;
      if ((!input.trim() && !hasImages) || isLoading) return;

      const now = Date.now();
      const userMessage: Message = {
        id: `user-${now}`,
        role: "user",
        content: input.trim(),
        timestamp: now,
        images: hasImages ? [...pendingImages] : undefined,
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      const imagesToSend = hasImages ? [...pendingImages] : [];
      setPendingImages([]);

      // 意图检测：本地处理便签/书签/搜索等操作
      const intent = detectIntent(userMessage.content);
      if (intent.type !== "none") {
        setIsLoading(true);
        try {
          const result = await executeIntent(intent);
          if (result) {
            // 本地处理完成，直接显示结果
            setMessages((prev) => [
              ...prev,
              {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: result,
                timestamp: Date.now(),
              },
            ]);
            return;
          }
          // result 为 null 表示需要发给 API（带 context）
        } finally {
          if (intent.type !== "summary") {
            setIsLoading(false);
          }
        }
        if (intent.type !== "summary") return;
      }

      // 获取 context（如果有意图需要 context）
      const context = intent.type !== "none" ? getContextForIntent(intent) : undefined;

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
            context,
            images: imagesToSend.map((img) => ({
              dataUrl: img.dataUrl,
              name: img.name,
              type: img.type,
            })),
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
        let chunkCount = 0;

        console.log("[Chat] Starting to read stream...");
        while (true) {
          const { done, value } = await reader.read();
          console.log("[Chat] Read result - done:", done, "value length:", value?.length);
          if (done) {
            console.log("[Chat] Stream ended, total chunks:", chunkCount);
            break;
          }

          chunkCount++;
          const chunk = decoder.decode(value, { stream: true });
          console.log("[Chat] Chunk #" + chunkCount + ":", chunk);
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
    [input, isLoading, messages, conversationId, pendingImages, t]
  );

  // autoSend: input 就绪后自动触发发送
  useEffect(() => {
    if (autoSendRef.current && input === autoSendRef.current) {
      autoSendRef.current = null;
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    }
  }, [input, handleSubmit]);

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
        {/* 头部栏 */}
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
            <span
              className={`font-geneva-12 text-[11px] select-none ${
                isMacTheme ? "text-neutral-600" : isXpTheme ? "text-[#003c74]" : "text-black"
              }`}
            >
              {new Date().toLocaleDateString(i18n.language, {
                month: "short",
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
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSubmit}
            onAddToInput={setInput}
          />
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
            pendingImages={pendingImages}
            onAddImages={handleAddImages}
            onRemoveImage={handleRemoveImage}
          />
        </div>
      </div>
    </WindowFrame>
  );
}
