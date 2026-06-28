#!/usr/bin/env bun
/**
 * [INPUT]: 依赖 src/worker/routes 的 assistant turn 归一化函数与 ./test-utils
 * [OUTPUT]: runChatStreamContractTests，验证空 assistant stream 不会成为可持久化空消息
 * [POS]: tests/ 的聊天流契约套件，锁住“只显示 Kyo 日期没有气泡”的回归
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import {
  resolveAssistantTurn,
  toAgentPrompt,
} from "../src/worker/routes";
import {
  assert,
  assertEq,
  clearResults,
  printSummary,
  runTest,
  section,
} from "./test-utils";
import type { ToolTraceEntry } from "../src/server/types";

export async function runChatStreamContractTests(): Promise<{ passed: number; failed: number }> {
  console.log(section("Chat Stream Contract"));
  clearResults();

  await runTest("empty assistant text without tools becomes explicit error", async () => {
    const result = resolveAssistantTurn("   ", []);
    assert(!result.ok, "Expected empty assistant text to be rejected");
    if (!result.ok) assertEq(result.error, "Agent returned an empty response");
  });

  await runTest("tool-only turn gets visible completion text", async () => {
    const result = resolveAssistantTurn("", [toolTrace("kyo-items", "success")]);
    assert(result.ok, "Expected successful tool-only turn to be renderable");
    if (result.ok) {
      assertEq(result.content, "已完成。");
      assertEq(result.synthetic, true);
    }
  });

  await runTest("real assistant text is preserved", async () => {
    const result = resolveAssistantTurn("  hello\n", []);
    assert(result.ok, "Expected non-empty assistant text to pass");
    if (result.ok) {
      assertEq(result.content, "  hello\n");
      assertEq(result.synthetic, false);
    }
  });

  await runTest("prompt excludes legacy empty assistant messages", async () => {
    const prompt = toAgentPrompt([
      { role: "user", content: "你好" },
      { role: "assistant", content: "" },
      { role: "assistant", content: "在的" },
    ]);
    assertEq(prompt, "USER: 你好\nASSISTANT: 在的");
  });

  return printSummary();
}

function toolTrace(tool: string, status: ToolTraceEntry["status"]): ToolTraceEntry {
  return {
    tool,
    status,
    at: new Date(0).toISOString(),
  };
}

if (import.meta.main) {
  runChatStreamContractTests().then(({ failed }) => process.exit(failed > 0 ? 1 : 0));
}
