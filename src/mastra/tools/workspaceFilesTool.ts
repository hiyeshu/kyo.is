/**
 * [INPUT]: 依赖 @mastra/core/tools、zod、Supabase client、../../server/types
 * [OUTPUT]: createReadWorkspaceFileTool / createWriteWorkspaceFileTool
 * [POS]: mastra/tools 的受控文件系统工具，把 agent 文件读写限定在当前用户 workspace_files 表
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

const pathSchema = z
  .string()
  .min(1)
  .regex(/^\/[A-Za-z0-9._/\- ]+$/);

const readInputSchema = z.object({
  path: pathSchema,
});

const readOutputSchema = z.object({
  path: z.string(),
  content: z.string(),
  exists: z.boolean(),
});

const writeInputSchema = z.object({
  path: pathSchema,
  content: z.string(),
});

const writeOutputSchema = z.object({
  path: z.string(),
  saved: z.boolean(),
});

export function createReadWorkspaceFileTool(context: ToolContext) {
  return createTool({
    id: "read-workspace-file",
    description: "Read a text file from the current user's Kyo workspace file system.",
    inputSchema: readInputSchema,
    outputSchema: readOutputSchema,
    execute: async (input) => {
      assertSafePath(input.path);
      pushTrace(context.trace, "read-workspace-file", "running", input);
      try {
        const { data, error } = await context.client
          .from("workspace_files")
          .select("path,content")
          .eq("user_id", context.userId)
          .eq("path", input.path)
          .maybeSingle();

        if (error) throw error;
        const output = {
          path: input.path,
          content: (data?.content as string | undefined) ?? "",
          exists: Boolean(data),
        };
        pushTrace(context.trace, "read-workspace-file", "success", input, output);
        return output;
      } catch (error) {
        pushTrace(context.trace, "read-workspace-file", "error", input, undefined, error);
        throw error;
      }
    },
  });
}

export function createWriteWorkspaceFileTool(context: ToolContext) {
  return createTool({
    id: "write-workspace-file",
    description: "Write a text file inside the current user's Kyo workspace file system.",
    inputSchema: writeInputSchema,
    outputSchema: writeOutputSchema,
    requireApproval: (input) => input.path === "/" || input.content.length > 20_000,
    execute: async (input) => {
      assertSafePath(input.path);
      pushTrace(context.trace, "write-workspace-file", "running", {
        path: input.path,
        bytes: input.content.length,
      });
      try {
        const { error } = await context.client.from("workspace_files").upsert(
          {
            user_id: context.userId,
            path: input.path,
            content: input.content,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,path" }
        );

        if (error) throw error;
        const output = { path: input.path, saved: true };
        pushTrace(context.trace, "write-workspace-file", "success", input, output);
        return output;
      } catch (error) {
        pushTrace(context.trace, "write-workspace-file", "error", input, undefined, error);
        throw error;
      }
    },
  });
}

function assertSafePath(path: string): void {
  if (path.includes("..") || path.includes("//")) {
    throw new Error("Unsafe workspace path");
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
