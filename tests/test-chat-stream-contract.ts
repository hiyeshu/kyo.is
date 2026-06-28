#!/usr/bin/env bun
/**
 * [INPUT]: 依赖 src/worker/routes 的 assistant turn 归一化函数与 ./test-utils
 * [OUTPUT]: runChatStreamContractTests，验证空 assistant stream、tool-only 文案与 clientEffects 收集契约
 * [POS]: tests/ 的聊天流契约套件，锁住“只显示 Kyo 日期没有气泡”和“工具成功但前端不同步”的回归
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import {
  collectClientEffects,
  collectClientToolEvents,
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

  await runTest("desktop sticky tool-only turn names verified desktop note", async () => {
    const result = resolveAssistantTurn("", [
      toolTrace("create-desktop-sticky", "success", {
        verified: true,
        row: { title: "今天吃什么", onDesktop: true },
      }),
    ]);
    assert(result.ok, "Expected verified desktop sticky to be renderable");
    if (result.ok) assertEq(result.content, "已创建并固定到桌面：今天吃什么");
  });

  await runTest("desktop sticky tool-only turn does not claim unverified desktop state", async () => {
    const result = resolveAssistantTurn("", [
      toolTrace("create-desktop-sticky", "success", {
        verified: false,
        row: { title: "今天吃什么", onDesktop: false },
      }),
    ]);
    assert(result.ok, "Expected successful tool-only turn to remain renderable");
    if (result.ok) assertEq(result.content, "已完成。");
  });

  await runTest("client effects are collected from successful tool outputs", async () => {
    const effects = collectClientEffects([
      toolTrace("create-desktop-sticky", "running"),
      toolTrace("create-desktop-sticky", "success", {
        clientEffect: {
          type: "sync-kyo-items",
          itemIds: ["note-a"],
          reason: "desktop-sticky-created",
        },
      }),
    ]);
    assertEq(effects.length, 1);
    assertEq(effects[0]?.type, "sync-kyo-items");
    assertEq(effects[0]?.itemIds[0], "note-a");
  });

  await runTest("client effects preserve deleted item hints", async () => {
    const effects = collectClientEffects([
      toolTrace("delete-kyo-item", "success", {
        clientEffect: {
          type: "sync-kyo-items",
          itemIds: ["note-a"],
          reason: "kyo-item-deleted",
          deletedItems: [{ id: "note-a", type: "note", text: "旧内容", color: "purple" }],
        },
      }),
    ]);
    assertEq(effects[0]?.deletedItems?.[0]?.text, "旧内容");
    assertEq(effects[0]?.deletedItems?.[0]?.color, "purple");
  });

  await runTest("tool trace can be rendered as separate step events", async () => {
    const result = collectClientToolEvents([
      toolTrace("search-kyo-items", "running"),
      toolTrace("search-kyo-items", "success", { items: [{ id: "note-a" }] }),
      toolTrace("delete-kyo-item", "success", { id: "note-a", deleted: true }),
    ]);
    assertEq(result.events.length, 3);
    assertEq(result.events[0]?.status, "running");
    assert(result.events[0]?.content.includes("搜索"), "Expected a search step message");
    assert(result.events[2]?.content.includes("删除"), "Expected a delete step message");
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

function toolTrace(tool: string, status: ToolTraceEntry["status"], output?: unknown): ToolTraceEntry {
  return {
    tool,
    status,
    output,
    at: new Date(0).toISOString(),
  };
}

if (import.meta.main) {
  runChatStreamContractTests().then(({ failed }) => process.exit(failed > 0 ? 1 : 0));
}
