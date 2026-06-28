/**
 * [INPUT]: 依赖 @mastra/core/agent、Supabase client、../../server/types、mastra/tools
 * [OUTPUT]: createKyoAgent，按请求创建绑定当前用户/channel 的 DeepSeek Mastra agent
 * [POS]: mastra/agents 的主 agent 定义，被 Cloudflare /api/agent/chat 路由消费，最终回复不复述工具步骤
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Agent } from "@mastra/core/agent";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClassifyContentTool } from "../tools/classifyContentTool";
import {
  createDesktopStickyTool,
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
      "Only describe actions that actually happened in tool results. Do not say you searched, checked, saved, or synced unless the relevant tool result proves it.",
      "Saved bookmarks, 收藏, notes, 便签, sticky notes, desktop bookmarks, and Dock bookmarks live in kyo_items. Search them with search-kyo-items and mutate them with typed Kyo item tools.",
      "Workspace files are only explicit files, paths, or documents. Do not use workspace file tools for saved bookmarks or notes.",
      "For Kyo item operations a user could do in the UI, use typed tools: create/save, edit text/title/tags/color, pin or unpin desktop, pin or unpin dock, delete, and reorder.",
      "For any request to create a desktop sticky note or 便利贴, use create-desktop-sticky instead of generic upsert-kyo-item.",
      "Only say a sticky note is on the desktop when create-desktop-sticky returns verified=true and onDesktop=true.",
      "When saving a URL or non-desktop note, classify it first, then write it with upsert-kyo-item.",
      "Before renaming, retagging, deleting, or reordering existing items, search for the target item and use its exact id.",
      "Use update-kyo-item for rename, tags, note text, color, desktop pin, dock pin, and order index changes.",
      "Use delete-kyo-item for deletion and reorder-kyo-items for explicit user-defined ordering.",
      "If a bookmark/note search returns zero, retry once with a shorter keyword or an empty query before saying there are no matches.",
      "When reporting search results, say bookmarks/notes/items. Never call saved bookmarks workspace projects.",
      "For file work, use read-workspace-file and write-workspace-file only.",
      "Do not narrate tool progress in the final answer. The chat UI renders search/write/delete steps from tool events; final replies should only summarize the outcome or ask for missing information.",
      "Keep replies concise and mention the concrete action you took.",
    ].join("\n"),
    model: {
      id: "deepseek/deepseek-v4-flash",
      url: "https://api.deepseek.com",
      apiKey: context.env.DEEPSEEK_API_KEY,
    },
    tools: {
      classifyContentTool: createClassifyContentTool(context),
      createDesktopStickyTool: createDesktopStickyTool(context),
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
