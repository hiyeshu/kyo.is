/**
 * [INPUT]: 依赖 zod，依赖 ./types 的 KyoWorkerEnv
 * [OUTPUT]: classifyContent / ClassificationResult，使用 DeepSeek 生成结构化内容标签
 * [POS]: server/ 的模型工具层，被 Mastra classifyContentTool 消费，替代旧打标工作流
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { z } from "zod";
import type { KyoWorkerEnv } from "./types";
import { requireEnv } from "./http";

export const ClassificationSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  tags: z.array(z.string()).default([]),
  category: z.enum(["bookmark", "note", "article", "tool", "unknown"]),
});

export type ClassificationResult = z.infer<typeof ClassificationSchema>;

export interface ClassifyContentInput {
  url?: string;
  title?: string;
  text?: string;
}

interface DeepSeekResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export async function classifyContent(
  env: KyoWorkerEnv,
  input: ClassifyContentInput
): Promise<ClassificationResult> {
  const apiKey = requireEnv(env, "DEEPSEEK_API_KEY");
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      stream: false,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Return strict JSON with title, summary, tags, category. Keep tags short and useful for a personal knowledge workspace.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek classify failed: ${response.status}`);
  }

  const data = (await response.json()) as DeepSeekResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek classify returned empty content");

  return ClassificationSchema.parse(JSON.parse(content));
}
