/**
 * [INPUT]: 依赖 @mastra/core/agent、Supabase client、../../server/types、mastra/tools
 * [OUTPUT]: createKyoAgent，按请求创建绑定当前用户/channel 的 DeepSeek Mastra agent
 * [POS]: mastra/agents 的主 agent 定义，被 Cloudflare /api/agent/chat 路由消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Agent } from "@mastra/core/agent";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClassifyContentTool } from "../tools/classifyContentTool";
import {
  createDeleteKyoItemTool,
  createReorderKyoItemsTool,
  createSearchKyoItemsTool,
  createUpdateKyoItemTool,
  createUpsertKyoItemTool,
} from "../tools/kyoItemsTool";
import {
  createReadWorkspaceFileTool,
  createWriteWorkspaceFileTool,
} from "../tools/workspaceFilesTool";
import type { KyoWorkerEnv, ToolTraceEntry } from "../../server/types";

export interface KyoAgentContext {
  env: KyoWorkerEnv;
  client: SupabaseClient;
  userId: string;
  channelId: string;
  trace: ToolTraceEntry[];
}

export function createKyoAgent(context: KyoAgentContext) {
  return new Agent({
    id: "kyo-agent",
    name: "Kyo Agent",
    instructions: [
      "You are Kyo's workspace agent.",
      "Operate only inside the current user's channel and workspace.",
      "Use tools for all persistent changes. Never invent that a save succeeded.",
      "When saving a URL or note, classify it first, then write it with upsert-kyo-item.",
      "Before renaming, retagging, deleting, or reordering existing items, search for the target item and use its exact id.",
      "Use update-kyo-item for rename, tags, note text, color, desktop pin, dock pin, and order index changes.",
      "Use delete-kyo-item for deletion and reorder-kyo-items for explicit user-defined ordering.",
      "For file work, use read-workspace-file and write-workspace-file only.",
      "Keep replies concise and mention the concrete action you took.",
    ].join("\n"),
    model: {
      id: "deepseek/deepseek-v4-flash",
      url: "https://api.deepseek.com",
      apiKey: context.env.DEEPSEEK_API_KEY,
    },
    tools: {
      classifyContentTool: createClassifyContentTool(context),
      searchKyoItemsTool: createSearchKyoItemsTool(context),
      upsertKyoItemTool: createUpsertKyoItemTool(context),
      updateKyoItemTool: createUpdateKyoItemTool(context),
      deleteKyoItemTool: createDeleteKyoItemTool(context),
      reorderKyoItemsTool: createReorderKyoItemsTool(context),
      readWorkspaceFileTool: createReadWorkspaceFileTool(context),
      writeWorkspaceFileTool: createWriteWorkspaceFileTool(context),
    },
  });
}
