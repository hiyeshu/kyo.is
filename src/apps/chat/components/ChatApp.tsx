/**
 * [INPUT]: 依赖 react hooks、Supabase auth、LoginDialog、getApiUrl、../../base/types 的 AppProps
 * [OUTPUT]: 对外提供 ChatAppComponent 组件
 * [POS]: apps/chat/components 的主组件，对接 /api/agent/chat 与 channel APIs，前置登录门禁，解析 0/d/3 流帧并管理 channelId、历史消息、图片附件、autoSend
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { useTranslation } from "react-i18next";
import { ChatMessages, type Message } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/dialogs/LoginDialog";
import { useThemeStore } from "@/stores/useThemeStore";
import { supabase } from "@/lib/supabase";
import { getApiUrl } from "@/utils/platform";
import {
  preprocessImage,
  validateImageFile,
  type ImageAttachment,
} from "../utils/imagePreprocessing";

interface ApiChannel {
  id: string;
  updated_at?: string;
}

interface ApiMessage {
  id?: string;
  role: "user" | "assistant" | "tool";
  content: string;
  created_at?: string;
}

const UNAUTHORIZED = "Unauthorized";

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
  // 状态管理（UI 暂存，channel 历史由服务端恢复）
  // -------------------------------------------------------------------------

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [pendingImages, setPendingImages] = useState<ImageAttachment[]>([]);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // 清理旧版本遗留的 localStorage
  useEffect(() => {
    try {
      localStorage.removeItem("kyo.chat.session");
      localStorage.removeItem("kyo.chat.history");
    } catch { /* ignore */ }
  }, []);

  // -------------------------------------------------------------------------
  // channel 记忆加载：服务端 Supabase 是真相源
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!isWindowOpen) return;

    let cancelled = false;
    async function loadLatestChannel() {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (!session?.access_token) return;

        const channelsResponse = await fetch(getApiUrl("/api/channels"), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!channelsResponse.ok) return;

        const channelsBody = (await channelsResponse.json()) as {
          channels?: ApiChannel[];
        };
        const latest = channelsBody.channels?.[0];
        if (!latest || cancelled) return;

        const messagesResponse = await fetch(
          getApiUrl(`/api/channels/${latest.id}/messages`),
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        if (!messagesResponse.ok) return;

        const messagesBody = (await messagesResponse.json()) as {
          messages?: ApiMessage[];
        };
        if (cancelled) return;

        setChannelId(latest.id);
        setMessages((messagesBody.messages ?? []).flatMap(toUiMessage));
      } catch {
        // 未登录、网络失败或历史加载失败时保持空会话。
      }
    }

    loadLatestChannel();
    return () => {
      cancelled = true;
    };
  }, [isWindowOpen]);

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
    setChannelId(null);
    setPendingImages([]);
  }, []);

  // -------------------------------------------------------------------------
  // 消息发送处理
  // -------------------------------------------------------------------------

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const hasImages = pendingImages.length > 0;
      if ((!input.trim() && !hasImages) || isLoading) return;

      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) {
        setIsLoginOpen(true);
        return;
      }

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
      setIsLoading(true);

      const controller = new AbortController();
      setAbortController(controller);

      const assistantMessageId = `assistant-${now}`;
      let hasAddedMessage = false;

      try {
        const response = await fetch(getApiUrl("/api/agent/chat"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            channelId,
            message: userMessage.content,
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            attachments: imagesToSend.map((img) => ({
              dataUrl: img.dataUrl,
              name: img.name,
              type: img.type,
            })),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(await readApiError(response));
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullContent = "";
        const assistantTimestamp = Date.now();

        let buffer = "";
        const processLine = (line: string) => {
          if (!line) return;

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
            return;
          }

          if (line.startsWith("d:")) {
            try {
              const data = JSON.parse(line.slice(2));
              if (data.channelId) {
                setChannelId(data.channelId);
              }
            } catch {
              // 忽略解析错误
            }
            return;
          }

          if (line.startsWith("3:")) {
            throw new Error(readStreamError(line));
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            processLine(line);
          }
        }
        processLine(buffer);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          // 用户取消
        } else {
          console.error("Chat error:", error);
          if (isUnauthorizedError(error)) setIsLoginOpen(true);
          const content = getChatErrorMessage(
            error,
            t("apps.chat.error", "抱歉，发生了错误，请重试。"),
            t("apps.chat.loginRequired", "未登录或登录已过期，请先登录。")
          );
          const errorTimestamp = Date.now();
          if (!hasAddedMessage) {
            setMessages((prev) => [
              ...prev,
              {
                id: assistantMessageId,
                role: "assistant",
                content,
                timestamp: errorTimestamp,
              },
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content,
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
    [input, isLoading, messages, channelId, pendingImages, t]
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
  // IACT 协议回调
  // -------------------------------------------------------------------------

  const handleIACTSend = useCallback(
    (text: string) => {
      setInput(text);
      // 使用 setTimeout 确保 input 状态更新后再提交
      setTimeout(() => {
        handleSubmit();
      }, 0);
    },
    [handleSubmit]
  );

  const handleIACTAdd = useCallback((text: string) => {
    setInput(text);
  }, []);

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
            onSendMessage={handleIACTSend}
            onAddToInput={handleIACTAdd}
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
      <LoginDialog isOpen={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </WindowFrame>
  );
}

function toUiMessage(message: ApiMessage): Message[] {
  if (message.role !== "user" && message.role !== "assistant") return [];
  return [
    {
      id: message.id ?? `${message.role}-${message.created_at ?? crypto.randomUUID()}`,
      role: message.role,
      content: message.content,
      timestamp: message.created_at ? new Date(message.created_at).getTime() : undefined,
    },
  ];
}

async function readApiError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const data = JSON.parse(text) as { error?: string };
    return data.error ?? `API error: ${response.status}`;
  } catch {
    return text || `API error: ${response.status}`;
  }
}

function readStreamError(line: string): string {
  try {
    return JSON.parse(line.slice(2));
  } catch {
    return "Agent stream failed";
  }
}

function getChatErrorMessage(
  error: unknown,
  fallback: string,
  loginRequired: string
): string {
  if (!(error instanceof Error)) return fallback;
  if (isUnauthorizedError(error)) return loginRequired;
  return error.message || fallback;
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && (
    error.message === UNAUTHORIZED || error.message.includes("401")
  );
}
