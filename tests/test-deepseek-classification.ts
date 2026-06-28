#!/usr/bin/env bun
/**
 * [INPUT]: 依赖 src/server/deepseek、src/mastra/tools/classifyContentTool 与 ./test-utils
 * [OUTPUT]: runDeepSeekClassificationTests，验证 DeepSeek 分类输出归一、失败降级与 agent 分类工具不中断后续工具循环
 * [POS]: tests/ 的模型分类契约套件，不需要真实 DeepSeek key，锁住打标失败不能阻断保存/删除的边界
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createClassifyContentTool } from "../src/mastra/tools/classifyContentTool";
import { normalizeClassification } from "../src/server/deepseek";
import type { KyoWorkerEnv, ToolTraceEntry } from "../src/server/types";
import {
  assert,
  assertEq,
  clearResults,
  printSummary,
  runTest,
  section,
} from "./test-utils";

export async function runDeepSeekClassificationTests(): Promise<{ passed: number; failed: number }> {
  console.log(section("DeepSeek Classification"));
  clearResults();

  await runTest("classification maps link-like categories to bookmark", async () => {
    const result = normalizeClassification(
      {
        title: "Example",
        summary: "A useful website",
        tags: "link, reference, reference",
        category: "website",
      },
      { url: "https://example.com" }
    );

    assertEq(result.category, "bookmark");
    assertJsonEq(result.tags, ["link", "reference"]);
  });

  await runTest("classification downgrades strange explicit categories to unknown", async () => {
    const result = normalizeClassification(
      {
        title: "Example",
        summary: "A useful website",
        tags: ["web"],
        category: "directory-entry",
      },
      { url: "https://example.com" }
    );

    assertEq(result.category, "unknown");
  });

  await runTest("classification infers category only when model omits it", async () => {
    const bookmark = normalizeClassification(
      { title: "Example", summary: "A useful website", tags: [] },
      { url: "https://example.com" }
    );
    const note = normalizeClassification(
      { title: "Note", summary: "Text note", tags: [] },
      { text: "记一下今天的计划" }
    );

    assertEq(bookmark.category, "bookmark");
    assertEq(note.category, "note");
  });

  await runTest("classify-content tool returns fallback instead of throwing", async () => {
    const trace: ToolTraceEntry[] = [];
    const tool = createClassifyContentTool({
      env: {} as KyoWorkerEnv,
      trace,
    });

    const result = await tool.execute({
      url: "https://example.com",
      title: "Example",
    });

    assertEq(result.category, "bookmark");
    assertEq(result.title, "Example");
    assertEq(trace[0]?.status, "running");
    assertEq(trace[1]?.status, "error");
    assert(trace[1]?.error?.includes("DEEPSEEK_API_KEY") ?? false, "Expected failed classify trace");
  });

  return printSummary();
}

function assertJsonEq(actual: unknown, expected: unknown): void {
  assertEq(JSON.stringify(actual), JSON.stringify(expected));
}

if (import.meta.main) {
  runDeepSeekClassificationTests().then(({ failed }) => process.exit(failed > 0 ? 1 : 0));
}
