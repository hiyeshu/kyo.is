/**
 * [INPUT]: 依赖 @supabase/supabase-js，依赖 ./types 的 ChannelRecord / ServerChatMessage
 * [OUTPUT]: channel CRUD、message CRUD、agent run 记录函数
 * [POS]: server/ 的 channel 真相源访问层，被 /api/channels 与 /api/agent/chat 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AgentRunRecord,
  ChannelRecord,
  ChatRole,
  ServerChatMessage,
  ToolTraceEntry,
} from "./types";

const DEFAULT_CHANNEL_NAME = "Kyo";

export async function listChannels(
  client: SupabaseClient,
  userId: string
): Promise<ChannelRecord[]> {
  const { data, error } = await client
    .from("agent_channels")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ChannelRecord[];
}

export async function createChannel(
  client: SupabaseClient,
  userId: string,
  name = DEFAULT_CHANNEL_NAME
): Promise<ChannelRecord> {
  const { data, error } = await client
    .from("agent_channels")
    .insert({ user_id: userId, name, kind: "chat" })
    .select()
    .single();

  if (error) throw error;
  return data as ChannelRecord;
}

export async function ensureChannel(
  client: SupabaseClient,
  userId: string,
  channelId?: string | null
): Promise<ChannelRecord> {
  if (!channelId) return createChannel(client, userId);

  const { data, error } = await client
    .from("agent_channels")
    .select("*")
    .eq("id", channelId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return createChannel(client, userId);
  return data as ChannelRecord;
}

export async function listChannelMessages(
  client: SupabaseClient,
  userId: string,
  channelId: string,
  limit = 20
): Promise<ServerChatMessage[]> {
  const { data, error } = await client
    .from("channel_messages")
    .select("*")
    .eq("channel_id", channelId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as ServerChatMessage[]).reverse();
}

export async function saveChannelMessage(
  client: SupabaseClient,
  params: {
    userId: string;
    channelId: string;
    role: ChatRole;
    content: string;
    toolTrace?: ToolTraceEntry[];
    attachments?: unknown;
  }
): Promise<ServerChatMessage> {
  const { data, error } = await client
    .from("channel_messages")
    .insert({
      user_id: params.userId,
      channel_id: params.channelId,
      role: params.role,
      content: params.content,
      tool_trace: params.toolTrace ?? [],
      attachments: params.attachments ?? [],
    })
    .select()
    .single();

  if (error) throw error;

  await client
    .from("agent_channels")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", params.channelId)
    .eq("user_id", params.userId);

  return data as ServerChatMessage;
}

export async function createAgentRun(
  client: SupabaseClient,
  userId: string,
  channelId: string
): Promise<AgentRunRecord> {
  const { data, error } = await client
    .from("agent_runs")
    .insert({ user_id: userId, channel_id: channelId, status: "running" })
    .select()
    .single();

  if (error) throw error;
  return data as AgentRunRecord;
}

export async function finishAgentRun(
  client: SupabaseClient,
  params: {
    runId: string;
    userId: string;
    status: "success" | "error";
    toolTrace: ToolTraceEntry[];
    error?: string;
  }
): Promise<void> {
  const { error } = await client
    .from("agent_runs")
    .update({
      status: params.status,
      tool_trace: params.toolTrace,
      error: params.error ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.runId)
    .eq("user_id", params.userId);

  if (error) throw error;
}
