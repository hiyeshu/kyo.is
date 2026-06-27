/**
 * [INPUT]: 依赖 @mastra/core/tools、zod、Supabase client、../../server/types
 * [OUTPUT]: createUpsertKyoItemTool / createSearchKyoItemsTool
 * [POS]: mastra/tools 的 Kyo 数据工具，唯一允许 agent 写入 kyo_items 的受控边界
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
  type: z.enum(["bookmark", "note"]),
  url: z.string().url().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  text: z.string().optional(),
  tags: z.array(z.string()).default([]),
  favicon: z.string().optional(),
});

const itemOutputSchema = z.object({
  id: z.string(),
  type: z.enum(["bookmark", "note"]),
  saved: z.boolean(),
});

const searchInputSchema = z.object({
  query: z.string().default(""),
  limit: z.number().int().min(1).max(20).default(5),
});

const searchOutputSchema = z.object({
  items: z.array(z.record(z.string(), z.unknown())),
});

export function createUpsertKyoItemTool(context: ToolContext) {
  return createTool({
    id: "upsert-kyo-item",
    description:
      "Create or update a bookmark or note in the current user's Kyo workspace. Use after classification when saving content.",
    inputSchema: itemInputSchema,
    outputSchema: itemOutputSchema,
    execute: async (input) => {
      pushTrace(context.trace, "upsert-kyo-item", "running", input);
      try {
        const output = await upsertKyoItem(context, {
          ...input,
          tags: input.tags ?? [],
        });
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
    description: "Search the current user's saved Kyo bookmarks and notes.",
    inputSchema: searchInputSchema,
    outputSchema: searchOutputSchema,
    execute: async (input) => {
      pushTrace(context.trace, "search-kyo-items", "running", input);
      try {
        const query = context.client
          .from("kyo_items")
          .select("*")
          .eq("user_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(input.limit ?? 5);

        const { data, error } = input.query
          ? await query.textSearch("title,summary,text", input.query, {
              type: "websearch",
              config: "simple",
            })
          : await query;

        if (error) throw error;
        const output = { items: (data ?? []) as Record<string, unknown>[] };
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
  if (input.type === "bookmark" && input.url) {
    const { data: existing, error: findError } = await context.client
      .from("kyo_items")
      .select("id")
      .eq("user_id", context.userId)
      .eq("url", input.url)
      .maybeSingle();

    if (findError) throw findError;

    if (existing?.id) {
      const { error } = await context.client
        .from("kyo_items")
        .update(toKyoItemPayload(context.userId, input))
        .eq("id", existing.id)
        .eq("user_id", context.userId);

      if (error) throw error;
      return { id: existing.id as string, type: input.type, saved: true };
    }
  }

  const { data, error } = await context.client
    .from("kyo_items")
    .insert(toKyoItemPayload(context.userId, input))
    .select("id,type")
    .single();

  if (error) throw error;
  return { id: data.id as string, type: data.type as "bookmark" | "note", saved: true };
}

function toKyoItemPayload(userId: string, input: z.infer<typeof itemInputSchema>) {
  return {
    user_id: userId,
    type: input.type,
    url: input.url ?? null,
    title: input.title ?? null,
    summary: input.summary ?? null,
    favicon: input.favicon ?? null,
    text: input.text ?? null,
    tags: input.tags,
  };
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
