/**
 * [INPUT]: 依赖 Dify Chatflow API，环境变量 DIFY_API_KEY
 * [OUTPUT]: 对外提供 POST /api/chat 端点，兼容 AI SDK useChat hook
 * [POS]: api/ 的聊天 API 端点，代理请求到 Dify，转换 SSE 格式
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const config = {
  runtime: "edge",
};

// ============================================================================
// Dify Chatflow API 配置
// ============================================================================

const DIFY_API_BASE = "https://api.dify.ai/v1";
const DIFY_API_KEY = process.env.DIFY_API_KEY;

// ============================================================================
// 类型定义
// ============================================================================

interface DifyMessageEvent {
  event: "message" | "message_end" | "error" | "workflow_started" | "workflow_finished";
  task_id?: string;
  message_id?: string;
  conversation_id?: string;
  answer?: string;
  metadata?: {
    usage?: {
      total_tokens: number;
      prompt_tokens: number;
      completion_tokens: number;
    };
  };
  code?: string;
  message?: string;
}

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  conversationId?: string;
}

// ============================================================================
// 主处理函数
// ============================================================================

export default async function handler(req: Request) {
  // -------------------------------------------------------------------------
  // 请求验证
  // -------------------------------------------------------------------------

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!DIFY_API_KEY) {
    console.error("DIFY_API_KEY is not configured");
    return new Response("API key not configured", { status: 500 });
  }

  try {
    const { messages, conversationId } = (await req.json()) as ChatRequest;

    // 获取最后一条用户消息作为 query
    const lastUserMessage = messages?.filter((m) => m.role === "user").pop();
    if (!lastUserMessage) {
      return new Response("No user message found", { status: 400 });
    }

    // -------------------------------------------------------------------------
    // 调用 Dify API
    // -------------------------------------------------------------------------

    const difyResponse = await fetch(`${DIFY_API_BASE}/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIFY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {},
        query: lastUserMessage.content,
        response_mode: "streaming",
        conversation_id: conversationId || "",
        user: "kyo-user",
      }),
    });

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text();
      console.error("Dify API error:", difyResponse.status, errorText);
      return new Response(`Dify API error: ${difyResponse.status}`, {
        status: difyResponse.status,
      });
    }

    // -------------------------------------------------------------------------
    // 转换 Dify SSE 为 AI SDK 格式
    // -------------------------------------------------------------------------

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk);
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6);
          if (!jsonStr || jsonStr === "[DONE]") continue;

          try {
            const event = JSON.parse(jsonStr) as DifyMessageEvent;

            // 处理不同事件类型
            if (event.event === "message" && event.answer) {
              // Dify message 事件 → AI SDK text delta 格式
              // AI SDK 期望格式: 0:"text content"
              const aiSdkChunk = `0:${JSON.stringify(event.answer)}\n`;
              controller.enqueue(encoder.encode(aiSdkChunk));
            } else if (event.event === "message_end") {
              // 消息结束，发送完成信号和 conversation_id
              // AI SDK 格式: d:{...metadata}
              const metadata = {
                conversationId: event.conversation_id,
                messageId: event.message_id,
                usage: event.metadata?.usage,
              };
              const finishChunk = `d:${JSON.stringify({ finishReason: "stop", ...metadata })}\n`;
              controller.enqueue(encoder.encode(finishChunk));
            } else if (event.event === "error") {
              console.error("Dify error event:", event.message);
              const errorChunk = `3:${JSON.stringify(event.message || "Unknown error")}\n`;
              controller.enqueue(encoder.encode(errorChunk));
            }
          } catch (e) {
            // 忽略解析错误，继续处理下一行
          }
        }
      },
    });

    // -------------------------------------------------------------------------
    // 返回流式响应
    // -------------------------------------------------------------------------

    return new Response(difyResponse.body?.pipeThrough(transformStream), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
