#!/usr/bin/env bun
/**
 * [INPUT]: 依赖 ./test-utils，请求当前 Cloudflare Worker API 边界
 * [OUTPUT]: runWorkerApiTests，验证静态资源、SPA fallback、CORS、鉴权、scrape 降级、兼容 API 与音频转写占位
 * [POS]: tests/ 的 Worker API 套件，替代旧 serverless API / chat-room / lyrics 测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import {
  BASE_URL,
  assert,
  assertEq,
  clearResults,
  fetchWithOrigin,
  printSummary,
  runTest,
  section,
} from "./test-utils";

export async function runWorkerApiTests(): Promise<{ passed: number; failed: number }> {
  console.log(section("Worker Static Routes"));
  clearResults();

  await runTest("root asset", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/`);
    assertEq(response.status, 200);
    assert((response.headers.get("content-type") || "").includes("text/html"), "Expected HTML");
  });

  await runTest("docs html rewrite", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/docs/overview`);
    assertEq(response.status, 200);
  });

  await runTest("app SPA fallback", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/chats`);
    assertEq(response.status, 200);
  });

  console.log(section("Worker API Guardrails"));

  await runTest("unknown API returns 404", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/api/unknown`);
    assertEq(response.status, 404);
  });

  await runTest("CORS preflight", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/api/agent/chat`, { method: "OPTIONS" });
    assertEq(response.status, 204);
    assertEq(response.headers.get("Access-Control-Allow-Origin"), "*");
  });

  await runTest("agent chat rejects GET", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/api/agent/chat`);
    assertEq(response.status, 405);
  });

  await runTest("agent chat requires auth", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/api/agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "ping" }),
    });
    assertEq(response.status, 401);
  });

  await runTest("legacy chat alias requires auth", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "ping" }),
    });
    assertEq(response.status, 401);
  });

  await runTest("channels require auth", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/api/channels`);
    assertEq(response.status, 401);
  });

  await runTest("channel messages require auth", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/api/channels/test-channel/messages`);
    assertEq(response.status, 401);
  });

  console.log(section("Worker Compatibility API"));

  await runTest("scrape rejects GET", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/api/scrape`);
    assertEq(response.status, 405);
  });

  await runTest("scrape validates url", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/api/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assertEq(response.status, 400);
  });

  await runTest("scrape falls back when metadata provider fails", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/api/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com" }),
    });
    assertEq(response.status, 200);
    const body = (await response.json()) as { title?: unknown; tags?: unknown };
    assertEq(body.title, "example.com");
    assert(Array.isArray(body.tags), "Expected tags array");
  });

  await runTest("bookmark preview validates url", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/api/bookmark-preview`);
    assertEq(response.status, 400);
  });

  await runTest("audio transcribe is explicit 501", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/api/audio-transcribe`, {
      method: "POST",
    });
    assertEq(response.status, 501);
  });

  await runTest("save requires auth", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/api/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "bookmark", url: "https://example.com" }),
    });
    assertEq(response.status, 401);
  });

  await runTest("search requires auth", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/api/search?q=test`);
    assertEq(response.status, 401);
  });

  await runTest("sync requires auth", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/api/sync`);
    assertEq(response.status, 401);
  });

  await runTest("item mutation requires auth", async () => {
    const response = await fetchWithOrigin(`${BASE_URL}/api/items/test-id`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New title" }),
    });
    assertEq(response.status, 401);
  });

  return printSummary();
}

if (import.meta.main) {
  runWorkerApiTests().then(({ failed }) => process.exit(failed > 0 ? 1 : 0));
}
