/**
 * [INPUT]: 依赖 @mastra/core/tools、zod、Supabase client、../../server/types
 * [OUTPUT]: createDesktopStickyTool / createUpsertKyoItemTool / createSearchKyoItemsTool / createUpdateKyoItemTool / createDeleteKyoItemTool / createReorderKyoItemsTool
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

const stickyColors = ["yellow", "blue", "green", "pink", "purple", "orange"] as const;

const itemBaseSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  color: z.enum(stickyColors).optional(),
  tags: z.array(z.string()).default([]),
  favicon: z.string().optional(),
  onDesktop: z.boolean().optional(),
  inDock: z.boolean().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

const itemInputSchema = itemBaseSchema
  .extend({
    type: z.enum(["bookmark", "note"]),
    url: z.string().url().optional(),
    text: z.string().optional(),
  })
  .superRefine((input, ctx) => {
    if (input.type === "bookmark" && !input.url) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "Bookmark requires url",
      });
    }

    if (input.type === "note" && !input.text?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["text"],
        message: "Note requires text",
      });
    }
  });

const desktopStickyInputSchema = z.object({
  title: z.string().optional(),
  text: z.string().min(1),
  color: z.enum(stickyColors).optional(),
  tags: z.array(z.string()).default([]),
  orderIndex: z.number().int().min(0).optional(),
});

const verifiedDesktopNoteSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  text: z.string().nullable(),
  color: z.string().nullable(),
  tags: z.array(z.string()),
  onDesktop: z.boolean(),
  orderIndex: z.number(),
});

const deletedItemHintSchema = z.object({
  id: z.string(),
  type: z.enum(["bookmark", "note"]).optional(),
  title: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  onDesktop: z.boolean().optional(),
});

const clientEffectSchema = z.object({
  type: z.literal("sync-kyo-items"),
  itemIds: z.array(z.string()),
  reason: z.string(),
  deletedItems: z.array(deletedItemHintSchema).optional(),
});

const itemOutputSchema = z.object({
  id: z.string(),
  type: z.enum(["bookmark", "note"]),
  saved: z.boolean(),
  action: z.enum(["created", "updated"]),
  clientEffect: clientEffectSchema,
});

const desktopStickyOutputSchema = z.object({
  id: z.string(),
  type: z.literal("note"),
  saved: z.boolean(),
  action: z.literal("created"),
  verified: z.boolean(),
  onDesktop: z.boolean(),
  row: verifiedDesktopNoteSchema,
  clientEffect: clientEffectSchema,
});

const updateInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  url: z.string().url().optional(),
  summary: z.string().optional(),
  text: z.string().optional(),
  color: z.enum(stickyColors).optional(),
  tags: z.array(z.string()).optional(),
  favicon: z.string().optional(),
  onDesktop: z.boolean().optional(),
  inDock: z.boolean().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

const updateOutputSchema = z.object({
  id: z.string(),
  updated: z.boolean(),
  clientEffect: clientEffectSchema,
});

const deleteInputSchema = z.object({
  id: z.string().uuid(),
});

const deleteOutputSchema = z.object({
  id: z.string(),
  deleted: z.boolean(),
  item: deletedItemHintSchema,
  clientEffect: clientEffectSchema,
});

const reorderInputSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

const reorderOutputSchema = z.object({
  updated: z.number().int().min(0),
  clientEffect: clientEffectSchema,
});

const searchInputSchema = z.object({
  query: z.string().default(""),
  limit: z.number().int().min(1).max(20).default(5),
});

const searchOutputSchema = z.object({
  items: z.array(z.record(z.string(), z.unknown())),
});

export function createDesktopStickyTool(context: ToolContext) {
  return createTool({
    id: "create-desktop-sticky",
    description:
      "Create a sticky note that must appear on the desktop. Always verifies the saved row has on_desktop=true and asks the client to sync desktop items.",
    inputSchema: desktopStickyInputSchema,
    outputSchema: desktopStickyOutputSchema,
    execute: (input) =>
      runWithTrace(context, "create-desktop-sticky", input, () =>
        createDesktopSticky(context, { ...input, tags: input.tags ?? [] })
      ),
  });
}

export function createUpsertKyoItemTool(context: ToolContext) {
  return createTool({
    id: "upsert-kyo-item",
    description:
      "Create a bookmark or sticky note, or update an existing bookmark when the URL already exists.",
    inputSchema: itemInputSchema,
    outputSchema: itemOutputSchema,
    execute: (input) =>
      runWithTrace(context, "upsert-kyo-item", input, () =>
        upsertKyoItem(context, { ...input, tags: input.tags ?? [] })
      ),
  });
}

export function createUpdateKyoItemTool(context: ToolContext) {
  return createTool({
    id: "update-kyo-item",
    description:
      "Rename, retag, edit, pin, recolor, or move a saved bookmark or sticky note owned by the current user.",
    inputSchema: updateInputSchema,
    outputSchema: updateOutputSchema,
    execute: (input) =>
      runWithTrace(context, "update-kyo-item", input, () =>
        updateKyoItem(context, input)
      ),
  });
}

export function createDeleteKyoItemTool(context: ToolContext) {
  return createTool({
    id: "delete-kyo-item",
    description: "Delete a saved bookmark or sticky note owned by the current user.",
    inputSchema: deleteInputSchema,
    outputSchema: deleteOutputSchema,
    execute: (input) =>
      runWithTrace(context, "delete-kyo-item", input, () =>
        deleteKyoItem(context, input.id)
      ),
  });
}

export function createReorderKyoItemsTool(context: ToolContext) {
  return createTool({
    id: "reorder-kyo-items",
    description:
      "Persist a user-defined order for bookmarks or sticky notes by assigning order indexes to the given item IDs.",
    inputSchema: reorderInputSchema,
    outputSchema: reorderOutputSchema,
    execute: (input) =>
      runWithTrace(context, "reorder-kyo-items", input, () =>
        reorderKyoItems(context, input.orderedIds)
      ),
  });
}

export function createSearchKyoItemsTool(context: ToolContext) {
  return createTool({
    id: "search-kyo-items",
    description: "Search the current user's saved Kyo bookmarks and sticky notes.",
    inputSchema: searchInputSchema,
    outputSchema: searchOutputSchema,
    execute: (input) =>
      runWithTrace(context, "search-kyo-items", input, () =>
        searchKyoItems(context, {
          query: input.query ?? "",
          limit: input.limit ?? 5,
        })
      ),
  });
}

async function createDesktopSticky(
  context: ToolContext,
  input: z.infer<typeof desktopStickyInputSchema>
): Promise<z.infer<typeof desktopStickyOutputSchema>> {
  const payload = await toInsertPayload(context, {
    ...input,
    type: "note",
    onDesktop: true,
    inDock: false,
  });
  const row = await insertAndReadDesktopNote(context, payload);
  if (!row.onDesktop) throw new Error("Desktop sticky verification failed");

  return {
    id: row.id,
    type: "note",
    saved: true,
    action: "created",
    verified: true,
    onDesktop: row.onDesktop,
    row,
    clientEffect: kyoItemsEffect([row.id], "desktop-sticky-created"),
  };
}

async function upsertKyoItem(
  context: ToolContext,
  input: z.infer<typeof itemInputSchema>
): Promise<z.infer<typeof itemOutputSchema>> {
  if (input.type === "bookmark" && input.url) {
    const existing = await findBookmarkByUrl(context, input.url);
    if (existing?.id) {
      await updateById(context, existing.id as string, toUpdatePayload(input));
      return {
        id: existing.id as string,
        type: input.type,
        saved: true,
        action: "updated",
        clientEffect: kyoItemsEffect([existing.id as string], "kyo-item-updated"),
      };
    }
  }

  const payload = await toInsertPayload(context, input);
  const { data, error } = await context.client
    .from("kyo_items")
    .insert(payload)
    .select("id,type")
    .single();

  if (error) throw error;
  const id = data.id as string;
  return {
    id,
    type: data.type as "bookmark" | "note",
    saved: true,
    action: "created",
    clientEffect: kyoItemsEffect([id], "kyo-item-created"),
  };
}

async function updateKyoItem(
  context: ToolContext,
  input: z.infer<typeof updateInputSchema>
): Promise<z.infer<typeof updateOutputSchema>> {
  const payload = toUpdatePayload(input);
  if (Object.keys(payload).length === 1) throw new Error("No fields to update");
  await updateById(context, input.id, payload);
  return { id: input.id, updated: true, clientEffect: kyoItemsEffect([input.id], "kyo-item-updated") };
}

async function deleteKyoItem(
  context: ToolContext,
  id: string
): Promise<z.infer<typeof deleteOutputSchema>> {
  const { data, error } = await context.client
    .from("kyo_items")
    .delete()
    .eq("id", id)
    .eq("user_id", context.userId)
    .select("id,type,title,text,url,color,on_desktop")
    .single();

  if (error) throw error;
  const item = toDeletedItemHint(data as Record<string, unknown>);
  return {
    id,
    deleted: true,
    item,
    clientEffect: kyoItemsEffect([id], "kyo-item-deleted", { deletedItems: [item] }),
  };
}

async function reorderKyoItems(
  context: ToolContext,
  orderedIds: string[]
): Promise<z.infer<typeof reorderOutputSchema>> {
  const { data, error } = await context.client
    .from("kyo_items")
    .select("id")
    .eq("user_id", context.userId)
    .in("id", orderedIds);

  if (error) throw error;
  const owned = new Set((data ?? []).map((item) => item.id as string));
  if (owned.size !== orderedIds.length) throw new Error("Some items are missing or not owned by the current user");

  await Promise.all(
    orderedIds.map((id, orderIndex) =>
      updateById(context, id, { order_index: orderIndex, updated_at: new Date().toISOString() })
    )
  );

  return {
    updated: orderedIds.length,
    clientEffect: kyoItemsEffect(orderedIds, "kyo-items-reordered"),
  };
}

async function searchKyoItems(
  context: ToolContext,
  input: z.infer<typeof searchInputSchema>
): Promise<z.infer<typeof searchOutputSchema>> {
  const query = context.client
    .from("kyo_items")
    .select("*")
    .eq("user_id", context.userId)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 5);

  const { data, error } = input.query
    ? await query.textSearch("title,summary,text", input.query, {
        type: "websearch",
        config: "simple",
      })
    : await query;

  if (error) throw error;
  return { items: (data ?? []) as Record<string, unknown>[] };
}

async function findBookmarkByUrl(context: ToolContext, url: string) {
  const { data, error } = await context.client
    .from("kyo_items")
    .select("id")
    .eq("user_id", context.userId)
    .eq("url", url)
    .maybeSingle();

  if (error) throw error;
  return data as { id: string } | null;
}

async function insertAndReadDesktopNote(
  context: ToolContext,
  payload: Record<string, unknown>
): Promise<z.infer<typeof verifiedDesktopNoteSchema>> {
  const { data, error } = await context.client
    .from("kyo_items")
    .insert(payload)
    .select("id,title,text,color,tags,on_desktop,order_index")
    .single();

  if (error) throw error;
  return toVerifiedDesktopNote(data as Record<string, unknown>);
}

function toVerifiedDesktopNote(row: Record<string, unknown>): z.infer<typeof verifiedDesktopNoteSchema> {
  return {
    id: row.id as string,
    title: (row.title as string | null) ?? null,
    text: (row.text as string | null) ?? null,
    color: (row.color as string | null) ?? null,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    onDesktop: row.on_desktop === true,
    orderIndex: Number(row.order_index ?? 0),
  };
}

function toDeletedItemHint(row: Record<string, unknown>): z.infer<typeof deletedItemHintSchema> {
  const type = row.type === "bookmark" || row.type === "note" ? row.type : undefined;
  return {
    id: row.id as string,
    ...(type ? { type } : {}),
    title: (row.title as string | null) ?? null,
    text: (row.text as string | null) ?? null,
    url: (row.url as string | null) ?? null,
    color: (row.color as string | null) ?? null,
    onDesktop: row.on_desktop === true,
  };
}

async function toInsertPayload(
  context: ToolContext,
  input: z.infer<typeof itemInputSchema>
): Promise<Record<string, unknown>> {
  return {
    user_id: context.userId,
    type: input.type,
    url: input.url ?? null,
    title: input.title ?? null,
    summary: input.summary ?? null,
    favicon: input.favicon ?? null,
    text: input.text ?? null,
    color: input.color ?? null,
    tags: normalizeTags(input.tags),
    on_desktop: input.onDesktop ?? false,
    in_dock: input.inDock ?? false,
    order_index: input.orderIndex ?? (await nextOrderIndex(context, input.type)),
  };
}

function toUpdatePayload(input: z.infer<typeof updateInputSchema> | z.infer<typeof itemInputSchema>): Record<string, unknown> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("title" in input) payload.title = input.title ?? null;
  if ("url" in input) payload.url = input.url ?? null;
  if ("summary" in input) payload.summary = input.summary ?? null;
  if ("text" in input) payload.text = input.text ?? null;
  if ("color" in input) payload.color = input.color ?? null;
  if ("tags" in input && input.tags) payload.tags = normalizeTags(input.tags);
  if ("favicon" in input) payload.favicon = input.favicon ?? null;
  if ("onDesktop" in input && typeof input.onDesktop === "boolean") payload.on_desktop = input.onDesktop;
  if ("inDock" in input && typeof input.inDock === "boolean") payload.in_dock = input.inDock;
  if ("orderIndex" in input && typeof input.orderIndex === "number") payload.order_index = input.orderIndex;
  return payload;
}

async function nextOrderIndex(context: ToolContext, type: "bookmark" | "note"): Promise<number> {
  const { data, error } = await context.client
    .from("kyo_items")
    .select("order_index")
    .eq("user_id", context.userId)
    .eq("type", type)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const current = Number((data as { order_index?: number } | null)?.order_index ?? -1);
  return Number.isFinite(current) ? current + 1 : 0;
}

async function updateById(
  context: ToolContext,
  id: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await context.client
    .from("kyo_items")
    .update(payload)
    .eq("id", id)
    .eq("user_id", context.userId)
    .select("id")
    .single();

  if (error) throw error;
}

function normalizeTags(tags: string[] = []): string[] {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).slice(0, 12);
}

function kyoItemsEffect(
  itemIds: string[],
  reason: string,
  extra: Partial<Pick<z.infer<typeof clientEffectSchema>, "deletedItems">> = {}
): z.infer<typeof clientEffectSchema> {
  return {
    type: "sync-kyo-items",
    itemIds,
    reason,
    ...extra,
  };
}

async function runWithTrace<TInput, TOutput>(
  context: ToolContext,
  tool: string,
  input: TInput,
  action: () => Promise<TOutput>
): Promise<TOutput> {
  pushTrace(context.trace, tool, "running", input);
  try {
    const output = await action();
    pushTrace(context.trace, tool, "success", input, output);
    return output;
  } catch (error) {
    pushTrace(context.trace, tool, "error", input, undefined, error);
    throw error;
  }
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
