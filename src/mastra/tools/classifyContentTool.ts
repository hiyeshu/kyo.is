/**
 * [INPUT]: 依赖 @mastra/core/tools、zod、../../server/deepseek、../../server/types
 * [OUTPUT]: createClassifyContentTool，提供 classifyContent Mastra 工具
 * [POS]: mastra/tools 的模型分类工具，被 Kyo agent 调用，负责内容摘要与标签生成，失败时降级输出以免阻断保存/删除
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { classifyContent, normalizeClassification } from "../../server/deepseek";
import type { KyoWorkerEnv, ToolTraceEntry } from "../../server/types";

interface ToolContext {
  env: KyoWorkerEnv;
  trace: ToolTraceEntry[];
}

const inputSchema = z.object({
  url: z.string().url().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
});

const outputSchema = z.object({
  title: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
  category: z.enum(["bookmark", "note", "article", "tool", "unknown"]),
});

export function createClassifyContentTool(context: ToolContext) {
  return createTool({
    id: "classify-content",
    description:
      "Summarize and tag a URL, note, or text snippet before saving it to the user's Kyo workspace.",
    inputSchema,
    outputSchema,
    execute: async (input) => {
      pushTrace(context.trace, "classify-content", "running", input);
      try {
        const output = await classifyContent(context.env, input);
        pushTrace(context.trace, "classify-content", "success", input, output);
        return output;
      } catch (error) {
        pushTrace(context.trace, "classify-content", "error", input, undefined, error);
        return normalizeClassification({}, input);
      }
    },
  });
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
