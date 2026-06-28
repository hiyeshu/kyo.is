/**
 * [INPUT]: 依赖 server/channel/supabase/http/types 与 mastra/createKyoAgent
 * [OUTPUT]: handleAgentChat / handleChannels / handleChannelMessages / collectClientEffects 路由处理函数
 * [POS]: worker/ 的 API 路由层，承接 Cloudflare Worker 请求并调用产品服务边界，把 agent toolTrace 归一成可持久化消息与前端 clientEffects
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createKyoAgent } from "../mastra";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAgentRun,
  createChannel,
  ensureChannel,
  finishAgentRun,
  listChannelMessages,
  listChannels,
  saveChannelMessage,
} from "../server/channels";
import { errorJson, json } from "../server/http";
import { createUserSupabase, requireUser } from "../server/supabase";
import type {
  AgentChatRequest,
  ExecutionContextLike,
  KyoWorkerEnv,
  ServerChatMessage,
  ToolTraceEntry,
} from "../server/types";

const EMPTY_ASSISTANT_RESPONSE = "Agent returned an empty response";
const TOOL_ONLY_ASSISTANT_RESPONSE = "已完成。";

export interface AgentClientEffect {
  type: "sync-kyo-items";
  itemIds: string[];
  reason: string;
}

export async function handleChannels(request: Request, env: KyoWorkerEnv): Promise<Response> {
  const auth = createUserSupabase(request, env);
  if (!auth) return errorJson("Unauthorized", 401);

  try {
    const user = await requireUser(auth.client);
    if (request.method === "GET") {
      return json({ channels: await listChannels(auth.client, user.id) });
    }

    if (request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as { name?: string };
      return json({ channel: await createChannel(auth.client, user.id, body.name) }, 201);
    }

    return errorJson("Method not allowed", 405);
  } catch (error) {
    return routeError(error);
  }
}

export async function handleChannelMessages(
  request: Request,
  env: KyoWorkerEnv,
  channelId: string
): Promise<Response> {
  if (request.method !== "GET") return errorJson("Method not allowed", 405);

  const auth = createUserSupabase(request, env);
  if (!auth) return errorJson("Unauthorized", 401);

  try {
    const user = await requireUser(auth.client);
    const messages = await listChannelMessages(auth.client, user.id, channelId, 50);
    return json({ messages });
  } catch (error) {
    return routeError(error);
  }
}

export async function handleAgentChat(
  request: Request,
  env: KyoWorkerEnv,
  ctx: ExecutionContextLike
): Promise<Response> {
  if (request.method !== "POST") return errorJson("Method not allowed", 405);

  const auth = createUserSupabase(request, env);
  if (!auth) return errorJson("Unauthorized", 401);

  try {
    const user = await requireUser(auth.client);
    const body = (await request.json()) as AgentChatRequest;
    const message = getUserMessage(body);
    if (!message) return errorJson("Missing user message");

    const channel = await ensureChannel(auth.client, user.id, body.channelId);
    await saveChannelMessage(auth.client, {
      userId: user.id,
      channelId: channel.id,
      role: "user",
      content: message,
      attachments: body.attachments ?? [],
    });

    const run = await createAgentRun(auth.client, user.id, channel.id);
    const history = await listChannelMessages(auth.client, user.id, channel.id, 20);
    const toolTrace: ToolTraceEntry[] = [];
    const agent = createKyoAgent({
      env,
      client: auth.client,
      userId: user.id,
      channelId: channel.id,
      trace: toolTrace,
    });

    const output = await agent.stream(toAgentPrompt(history), {
      maxSteps: 6,
      providerOptions: {
        deepseek: {
          thinking: { type: "disabled" },
        },
      },
    });

    return streamAgentOutput({
      output,
      channelId: channel.id,
      runId: run.id,
      userId: user.id,
      client: auth.client,
      toolTrace,
      ctx,
    });
  } catch (error) {
    return routeError(error);
  }
}

function getUserMessage(body: AgentChatRequest): string {
  const direct = body.message?.trim();
  if (direct) return direct;

  const last = body.messages?.filter((item) => item.role === "user").pop();
  return last?.content.trim() ?? "";
}

export function toAgentPrompt(messages: ServerChatMessage[]): string {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .filter((message) => message.content.trim().length > 0)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");
}

function streamAgentOutput(params: {
  output: Awaited<ReturnType<ReturnType<typeof createKyoAgent>["stream"]>>;
  channelId: string;
  runId: string;
  userId: string;
  client: SupabaseClient;
  toolTrace: ToolTraceEntry[];
  ctx: ExecutionContextLike;
}): Response {
  const encoder = new TextEncoder();
  let fullContent = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = params.output.textStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullContent += value;
          controller.enqueue(encoder.encode(`0:${JSON.stringify(value)}\n`));
        }

        const assistantTurn = resolveAssistantTurn(fullContent, params.toolTrace);
        if (!assistantTurn.ok) throw new Error(assistantTurn.error);
        if (assistantTurn.synthetic) {
          controller.enqueue(encoder.encode(`0:${JSON.stringify(assistantTurn.content)}\n`));
        }

        const persist = persistAssistantTurn({
          ...params,
          content: assistantTurn.content,
          status: "success",
        });
        params.ctx.waitUntil(persist);

        controller.enqueue(
          encoder.encode(
            `d:${JSON.stringify({
              channelId: params.channelId,
              runId: params.runId,
              toolTrace: params.toolTrace,
              clientEffects: collectClientEffects(params.toolTrace),
            })}\n`
          )
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Agent stream failed";
        params.ctx.waitUntil(
          persistAssistantTurn({
            ...params,
            content: message,
            status: "error",
            error: message,
          })
        );
        controller.enqueue(encoder.encode(`3:${JSON.stringify(message)}\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export type AssistantTurnResolution =
  | { ok: true; content: string; synthetic: boolean }
  | { ok: false; error: string };

export function resolveAssistantTurn(
  content: string,
  toolTrace: ToolTraceEntry[]
): AssistantTurnResolution {
  if (content.trim().length > 0) return { ok: true, content, synthetic: false };
  if (hasSuccessfulToolTrace(toolTrace)) {
    return { ok: true, content: toolOnlyMessage(toolTrace), synthetic: true };
  }
  return { ok: false, error: EMPTY_ASSISTANT_RESPONSE };
}

function hasSuccessfulToolTrace(toolTrace: ToolTraceEntry[]): boolean {
  return toolTrace.some((entry) => entry.status === "success");
}

function toolOnlyMessage(toolTrace: ToolTraceEntry[]): string {
  const note = toolTrace.find((entry) => {
    const output = asRecord(entry.output);
    const row = asRecord(output?.row);
    return entry.tool === "create-desktop-sticky"
      && entry.status === "success"
      && output?.verified === true
      && row?.onDesktop === true;
  });
  const row = asRecord(asRecord(note?.output)?.row);
  const label = String(row?.title || row?.text || "").trim();
  return note ? `已创建并固定到桌面${label ? `：${label}` : "。"}` : TOOL_ONLY_ASSISTANT_RESPONSE;
}

export function collectClientEffects(toolTrace: ToolTraceEntry[]): AgentClientEffect[] {
  const seen = new Set<string>();
  return toolTrace.flatMap((entry) => {
    if (entry.status !== "success") return [];
    const effect = readClientEffect(asRecord(entry.output)?.clientEffect);
    if (!effect) return [];
    const key = `${effect.type}:${effect.itemIds.join(",")}:${effect.reason}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [effect];
  });
}

function readClientEffect(value: unknown): AgentClientEffect | null {
  const effect = asRecord(value);
  if (effect?.type !== "sync-kyo-items") return null;
  const itemIds = Array.isArray(effect.itemIds) ? effect.itemIds.map(String).filter(Boolean) : [];
  if (itemIds.length === 0) return null;
  return { type: "sync-kyo-items", itemIds, reason: String(effect.reason ?? "agent-tool-success") };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function persistAssistantTurn(params: {
  client: SupabaseClient;
  userId: string;
  channelId: string;
  runId: string;
  content: string;
  status: "success" | "error";
  toolTrace: ToolTraceEntry[];
  error?: string;
}) {
  await saveChannelMessage(params.client, {
    userId: params.userId,
    channelId: params.channelId,
    role: "assistant",
    content: params.content,
    toolTrace: params.toolTrace,
  });

  await finishAgentRun(params.client, {
    runId: params.runId,
    userId: params.userId,
    status: params.status,
    toolTrace: params.toolTrace,
    error: params.error,
  });
}

function routeError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Internal server error";
  const status = message === "Unauthorized" ? 401 : 500;
  return errorJson(message, status);
}
