/**
 * [INPUT]: 依赖 ../worker/env.d.ts 生成的 WorkerBindings 全局接口
 * [OUTPUT]: KyoWorkerEnv 类型别名、ExecutionContextLike、ToolTraceEntry、ServerChatMessage、AgentChatRequest 类型
 * [POS]: server/ 的共享契约，被 worker 路由、Mastra 工具、Supabase 数据层共同消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export type KyoWorkerEnv = WorkerBindings;

export interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

export type ChatRole = "user" | "assistant" | "tool";

export interface ServerChatMessage {
  id?: string;
  role: ChatRole;
  content: string;
  created_at?: string;
  tool_trace?: ToolTraceEntry[];
}

export interface ToolTraceEntry {
  tool: string;
  status: "running" | "success" | "error";
  input?: unknown;
  output?: unknown;
  error?: string;
  at: string;
}

export interface AgentChatRequest {
  channelId?: string | null;
  message?: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  attachments?: Array<{ dataUrl: string; name: string; type: string }>;
}

export interface ChannelRecord {
  id: string;
  user_id: string;
  name: string;
  kind: string;
  created_at: string;
  updated_at: string;
}

export interface AgentRunRecord {
  id: string;
  channel_id: string;
  user_id: string;
  status: "running" | "success" | "error";
}
