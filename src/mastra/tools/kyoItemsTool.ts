/**
 * [INPUT]: 依赖 @mastra/core/tools、zod、Supabase client、../../server/types
 * [OUTPUT]: createUpsertKyoItemTool / createSearchKyoItemsTool，支持 id/url 更新与 search_items 统一检索
 * [POS]: mastra/tools 的 Kyo 数据工具，唯一允许 agent 写入 kyo_items 与桌面便利贴字段的受控边界
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createTool } from "@mastra/core/tools";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { ToolTraceEntry } from "../../server/types";

interface ToolContext {
  client: SupabaseClient;
  userId: string;
  trace: ToolTraceEntry[];
}

const itemInputSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(["bookmark", "note"]),
  url: z.string().url().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  text: z.string().optional(),
  tags: z.array(z.string()).optional(),
  favicon: z.string().optional(),
  color: z.enum(["yellow", "blue", "green", "pink", "purple", "orange"]).optional(),
  onDesktop: z.boolean().optional(),
});

const itemOutputSchema = z.object({
  id: z.string(),
  type: z.enum(["bookmark", "note"]),
  saved: z.boolean(),
  action: z.enum(["created", "updated"]),
});

const searchInputSchema = z.object({
  query: z.string().default(""),
  limit: z.number().int().min(1).max(20).default(5),
});

const searchOutputSchema = z.object({
  items: z.array(z.record(z.string(), z.unknown())),
  query: z.string(),
});

export function createUpsertKyoItemTool(context: ToolContext) {
  return createTool({
    id: "upsert-kyo-item",
    description:
      "Create or update a saved Kyo bookmark or note in kyo_items. Pass id when updating an item returned by search-kyo-items. Use onDesktop=true when a bookmark or note should appear on the desktop.",
    inputSchema: itemInputSchema,
    outputSchema: itemOutputSchema,
    execute: async (input) => {
      pushTrace(context.trace, "upsert-kyo-item", "running", input);
      try {
        const output = await upsertKyoItem(context, input);
        pushTrace(context.trace, "upsert-kyo-item", "success", input, output);
        return output;
      } catch (error) {
        pushTrace(context.trace, "upsert-kyo-item", "error", input, undefined, error);
        throw error;
      }
    },
  });
}

export function createSearchKyoItemsTool(context: ToolContext) {
  return createTool({
    id: "search-kyo-items",
    description:
      "Search the current user's saved Kyo bookmarks and notes from kyo_items. This is for 收藏, 书签, notes, sticky notes, desktop bookmark placement, and saved URLs; it is not workspace file search.",
    inputSchema: searchInputSchema,
    outputSchema: searchOutputSchema,
    execute: async (input) => {
      pushTrace(context.trace, "search-kyo-items", "running", input);
      try {
        const query = (input.query ?? "").trim();
        const { data, error } = await context.client.rpc("search_items", {
          q: query,
          lim: input.limit ?? 5,
        });
        if (error) throw error;
        const output = { items: (data ?? []) as Record<string, unknown>[], query };
        pushTrace(context.trace, "search-kyo-items", "success", input, output);
        return output;
      } catch (error) {
        pushTrace(context.trace, "search-kyo-items", "error", input, undefined, error);
        throw error;
      }
    },
  });
}

async function upsertKyoItem(
  context: ToolContext,
  input: z.infer<typeof itemInputSchema>
): Promise<z.infer<typeof itemOutputSchema>> {
  if (input.id) {
    return updateKyoItem(context, input.id, input);
  }

  if (input.type === "bookmark" && input.url) {
    const { data: existing, error: findError } = await context.client
      .from("kyo_items")
      .select("id")
      .eq("user_id", context.userId)
      .eq("url", input.url)
      .maybeSingle();

    if (findError) throw findError;

    if (existing?.id) {
      return updateKyoItem(context, existing.id as string, input);
    }
  }

  const { data, error } = await context.client
    .from("kyo_items")
    .insert(toKyoItemInsert(context.userId, input))
    .select("id,type")
    .single();

  if (error) throw error;
  return { id: data.id as string, type: data.type as "bookmark" | "note", saved: true, action: "created" };
}

async function updateKyoItem(
  context: ToolContext,
  itemId: string,
  input: z.infer<typeof itemInputSchema>
): Promise<z.infer<typeof itemOutputSchema>> {
  const payload = toKyoItemUpdate(input);
  if (Object.keys(payload).length === 0) {
    throw new Error("No Kyo item fields to update");
  }

  const { data, error } = await context.client
    .from("kyo_items")
    .update(payload)
    .eq("id", itemId)
    .eq("user_id", context.userId)
    .select("id,type")
    .single();

  if (error) throw error;
  return { id: data.id as string, type: data.type as "bookmark" | "note", saved: true, action: "updated" };
}

function toKyoItemInsert(userId: string, input: z.infer<typeof itemInputSchema>) {
  return {
    user_id: userId,
    type: input.type,
    url: input.url ?? null,
    title: input.title ?? null,
    summary: input.summary ?? null,
    favicon: input.favicon ?? null,
    text: input.text ?? null,
    tags: input.tags ?? [],
    color: input.color ?? null,
    on_desktop: input.onDesktop ?? false,
  };
}

function toKyoItemUpdate(input: z.infer<typeof itemInputSchema>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.url !== undefined) payload.url = input.url;
  if (input.title !== undefined) payload.title = input.title;
  if (input.summary !== undefined) payload.summary = input.summary;
  if (input.favicon !== undefined) payload.favicon = input.favicon;
  if (input.text !== undefined) payload.text = input.text;
  if (input.tags !== undefined) payload.tags = input.tags;
  if (input.color !== undefined) payload.color = input.color;
  if (input.onDesktop !== undefined) payload.on_desktop = input.onDesktop;
  if (Object.keys(payload).length > 0) payload.updated_at = new Date().toISOString();

  return payload;
}

function pushTrace(
  trace: ToolTraceEntry[],
  tool: string,
  status: ToolTraceEntry["status"],
  input?: unknown,
  output?: unknown,
  error?: unknown
) {
  trace.push({
    tool,
    status,
    input,
    output,
    error: error instanceof Error ? error.message : undefined,
    at: new Date().toISOString(),
  });
}
