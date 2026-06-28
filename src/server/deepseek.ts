/**
 * [INPUT]: 依赖 zod，依赖 ./types 的 KyoWorkerEnv
 * [OUTPUT]: classifyContent / ClassificationResult / normalizeClassification，使用 DeepSeek 生成并正规化结构化内容标签
 * [POS]: server/ 的模型工具层，被 Mastra classifyContentTool 消费，替代旧打标工作流，把模型 JSON 归一为产品契约
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
type ClassificationCategory = ClassificationResult["category"];

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

  return normalizeClassification(JSON.parse(stripJsonFence(content)), input);
}

export function normalizeClassification(
  value: unknown,
  input: ClassifyContentInput = {}
): ClassificationResult {
  const record = asRecord(value);
  return ClassificationSchema.parse({
    title: firstNonEmpty(record.title, input.title, input.url, input.text, "Untitled"),
    summary: firstNonEmpty(record.summary, record.description, input.text, input.title, input.url, "No summary"),
    tags: normalizeTags(record.tags),
    category: normalizeCategory(record.category, input),
  });
}

function normalizeCategory(value: unknown, input: ClassifyContentInput): ClassificationCategory {
  const raw = String(value ?? "").trim().toLowerCase();
  const aliases: Record<string, ClassificationCategory> = {
    bookmark: "bookmark",
    link: "bookmark",
    url: "bookmark",
    web: "bookmark",
    website: "bookmark",
    note: "note",
    text: "note",
    sticky: "note",
    article: "article",
    post: "article",
    blog: "article",
    tool: "tool",
    app: "tool",
    software: "tool",
    service: "tool",
    unknown: "unknown",
  };
  if (aliases[raw]) return aliases[raw];
  if (raw) return "unknown";
  if (input.url) return "bookmark";
  if (input.text) return "note";
  return "unknown";
}

function normalizeTags(value: unknown): string[] {
  const tags = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,，#]/)
      : [];
  return Array.from(new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))).slice(0, 8);
}

function firstNonEmpty(...values: unknown[]): string {
  const value = values.find((item) => String(item ?? "").trim().length > 0);
  return String(value ?? "").trim();
}

function stripJsonFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
