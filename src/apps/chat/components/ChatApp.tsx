/**
 * [INPUT]: 依赖 react hooks，依赖 ../../base/types 的 AppProps，依赖 useAudioTranscription
 * [OUTPUT]: 对外提供 ChatAppComponent 组件
 * [POS]: apps/chat/components 的主组件，对接 Dify Chatflow API，管理图片附件+语音转录
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
import { useAudioTranscription } from "@/hooks/useAudioTranscription";
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
  instanceId,
  onNavigateNext,
  onNavigatePrevious,
}: AppProps) {
  const { t, i18n } = useTranslation();
  const currentTheme = useThemeStore((s) => s.current);
  const isMacTheme = currentTheme === "macosx";
  const isXpTheme = currentTheme === "xp" || currentTheme === "win98";
  const persistTimeoutRef = useRef<number | null>(null);
  const hasLoadedRef = useRef(false);

  const storageKey = "kyo.chat.session";
  const historyStorageKey = "kyo.chat.history";

  // -------------------------------------------------------------------------
  // 状态管理
  // -------------------------------------------------------------------------

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [pendingImages, setPendingImages] = useState<ImageAttachment[]>([]);
  const [historySessions, setHistorySessions] = useState<
    Array<{
      id: string;
      createdAt: number;
      messages: Message[];
    }>
  >([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // -------------------------------------------------------------------------
  // 会话持久化
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        messages?: Message[];
        input?: string;
        conversationId?: string | null;
        pendingImages?: ImageAttachment[];
      };

      if (parsed.messages && Array.isArray(parsed.messages)) {
        setMessages(parsed.messages);
      }
      if (typeof parsed.input === "string") {
        setInput(parsed.input);
      }
      if (typeof parsed.conversationId !== "undefined") {
        setConversationId(parsed.conversationId ?? null);
      }
      if (parsed.pendingImages && Array.isArray(parsed.pendingImages)) {
        setPendingImages(parsed.pendingImages);
      }
    } catch {
      // ignore invalid storage
    }

    try {
      const rawHistory = localStorage.getItem(historyStorageKey);
      if (!rawHistory) return;
      const parsedHistory = JSON.parse(rawHistory) as Array<{
        id: string;
        createdAt: number;
        messages: Message[];
      }>;
      if (Array.isArray(parsedHistory)) {
        setHistorySessions(parsedHistory);
      }
    } catch {
      // ignore invalid history storage
    }
  }, [historyStorageKey, storageKey]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (persistTimeoutRef.current) {
      window.clearTimeout(persistTimeoutRef.current);
    }

    persistTimeoutRef.current = window.setTimeout(() => {
      const payload = {
        messages,
        input,
        conversationId,
        pendingImages,
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        // ignore quota errors
      }
    }, 250);

    return () => {
      if (persistTimeoutRef.current) {
        window.clearTimeout(persistTimeoutRef.current);
      }
    };
  }, [messages, input, conversationId, pendingImages, storageKey]);

  // -------------------------------------------------------------------------
  // 语音转录
  // -------------------------------------------------------------------------

  const {
    isRecording,
    frequencies,
    isSilent,
    startRecording,
    stopRecording,
  } = useAudioTranscription({
    onTranscriptionComplete: (text) => {
      if (text.trim()) {
        setInput((prev) => (prev ? prev + " " + text : text));
      }
    },
    onError: (error) => {
      console.error("Audio transcription error:", error);
    },
    frequencyBands: 48,
    silenceThreshold: 2000,
  });

  const handleMicClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

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
    if (messages.length > 0) {
      const entry = {
        id: `history-${Date.now()}`,
        createdAt: Date.now(),
        messages,
      };
      setHistorySessions((prev) => {
        const next = [entry, ...prev].slice(0, 50);
        try {
          localStorage.setItem(historyStorageKey, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
    }

    setMessages([]);
    setConversationId(null);
    setPendingImages([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore storage errors
    }
  }, [historyStorageKey, messages, storageKey]);

  const handleToggleHistory = useCallback(() => {
    setIsHistoryOpen((prev) => !prev);
  }, []);

  const handleViewHistory = useCallback(
    (entryId: string) => {
      const entry = historySessions.find((item) => item.id === entryId);
      if (!entry) return;
      setMessages(entry.messages);
      setIsLoading(false);
      setIsHistoryOpen(false);
    },
    [historySessions]
  );

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

  const groupedHistory = historySessions.reduce(
    (acc, entry) => {
      const entryDate = new Date(entry.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateLabel: string;
      if (entryDate.toDateString() === today.toDateString()) {
        dateLabel = t("apps.chat.historyToday", "今天");
      } else if (entryDate.toDateString() === yesterday.toDateString()) {
        dateLabel = t("apps.chat.historyYesterday", "昨天");
      } else {
        dateLabel = entryDate.toLocaleDateString(i18n.language, {
          month: "short",
          day: "numeric",
        });
      }

      if (!acc[dateLabel]) acc[dateLabel] = [];
      acc[dateLabel].push(entry);
      return acc;
    },
    {} as Record<string, Array<{ id: string; createdAt: number; messages: Message[] }>>
  );

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
          {/* 左侧：日期按钮 */}
          <div className="relative flex items-center gap-1 px-2">
            <button
              type="button"
              onClick={handleToggleHistory}
              className={`flex items-center gap-1.5 cursor-pointer select-none ${
                isMacTheme
                  ? "px-2 py-0.5 rounded hover:bg-black/5 active:bg-black/10"
                  : isXpTheme
                    ? "px-2 py-0.5 border border-[#003c74] rounded bg-gradient-to-b from-[#fff] to-[#e3dcd4] shadow-[inset_0_1px_0_#fff,0_1px_2px_rgba(0,0,0,0.2)] hover:from-[#fefefe] hover:to-[#d6cfc7] active:from-[#e3dcd4] active:to-[#fff] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]"
                    : "px-1.5 py-0.5 border-t border-l border-white border-r-[#808080] border-b-[#808080] bg-[#c0c0c0] shadow-[inset_-1px_-1px_0_#404040,inset_1px_1px_0_#dfdfdf] active:shadow-[inset_1px_1px_0_#404040,inset_-1px_-1px_0_#dfdfdf]"
              }`}
              aria-label={t("apps.chat.history", "历史")}
            >
              <span
                className={`font-geneva-12 text-[11px] ${
                  isMacTheme ? "text-neutral-600" : isXpTheme ? "text-[#003c74]" : "text-black"
                }`}
              >
                {new Date().toLocaleDateString(i18n.language, {
                  month: "short",
                  day: "numeric",
                  weekday: "short",
                })}
              </span>
              <span className="inline-flex items-center">
                <svg
                  width="8"
                  height="5"
                  viewBox="0 0 8 5"
                  aria-hidden="true"
                >
                  <path
                    d="M0.5 0.5l3.5 4 3.5-4"
                    fill="none"
                    stroke={isMacTheme ? "#666" : isXpTheme ? "#003c74" : "#000"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>

            {isHistoryOpen && (
              <div
                className={`absolute left-0 top-full mt-1 w-64 z-20 ${
                  isMacTheme
                    ? "rounded-lg border border-black/20 bg-white/95 backdrop-blur-xl shadow-lg"
                    : isXpTheme
                      ? "rounded border border-[#919b9c] bg-white shadow-md"
                      : "border border-black bg-white shadow-[2px_2px_0_0_#000]"
                }`}
              >
                <div className="max-h-52 overflow-y-auto">
                  {historySessions.length === 0 ? (
                    <div className="px-3 py-4 text-[11px] text-neutral-500 font-geneva-12 text-center">
                      {t("apps.chat.historyEmpty", "暂无历史")}
                    </div>
                  ) : (
                    Object.entries(groupedHistory).map(([dateLabel, entries]) => (
                      <div
                        key={dateLabel}
                        className={`${
                          isMacTheme
                            ? "border-b border-black/10 last:border-b-0"
                            : isXpTheme
                              ? "border-b border-[#d4d0c8] last:border-b-0"
                              : "border-b border-neutral-300 last:border-b-0"
                        }`}
                      >
                        <div
                          className={`px-3 py-1.5 text-[10px] font-geneva-12 ${
                            isMacTheme
                              ? "text-neutral-400 uppercase tracking-wide"
                              : "text-neutral-500"
                          }`}
                        >
                          {dateLabel}
                        </div>
                        {entries.map((entry) => {
                          const firstText =
                            entry.messages.find((msg) => msg.content.trim())?.content ??
                            t("apps.chat.historyCurrent", "空对话");
                          return (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => handleViewHistory(entry.id)}
                              className={`w-full text-left px-3 py-2 text-[11px] font-geneva-12 transition-colors ${
                                isMacTheme
                                  ? "hover:bg-blue-500/10 active:bg-blue-500/20"
                                  : isXpTheme
                                    ? "hover:bg-[#316ac5] hover:text-white"
                                    : "hover:bg-neutral-200"
                              }`}
                            >
                              <div
                                className={`truncate ${
                                  isMacTheme ? "text-neutral-700" : "text-neutral-600"
                                }`}
                              >
                                {firstText}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
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
            pendingImages={pendingImages}
            onAddImages={handleAddImages}
            onRemoveImage={handleRemoveImage}
            isRecording={isRecording}
            frequencies={frequencies}
            isSilent={isSilent}
            onMicClick={handleMicClick}
          />
        </div>
      </div>
    </WindowFrame>
  );
}
