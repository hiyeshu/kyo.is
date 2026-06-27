#!/usr/bin/env bun
/**
 * [INPUT]: 依赖 fetch/process，读取 KYO_BASE_URL 作为 Worker 验证目标
 * [OUTPUT]: 输出 Cloudflare Worker smoke test 结果，验证静态入口、SPA fallback、API 鉴权与 CORS
 * [POS]: scripts/ 的 Worker 发布后验证器，被 package.json verify:worker 调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const baseUrl = normalizeBaseUrl(process.env.KYO_BASE_URL ?? "http://127.0.0.1:8787");

type SmokeCheck = {
  name: string;
  method?: string;
  path: string;
  body?: unknown;
  expectedStatus: number;
  expectHeader?: [string, string];
};

const REQUEST_TIMEOUT_MS = 10_000;

const checks: SmokeCheck[] = [
  { name: "root asset", path: "/", expectedStatus: 200 },
  { name: "docs html", path: "/docs/overview", expectedStatus: 200 },
  { name: "app fallback", path: "/chats", expectedStatus: 200 },
  { name: "unknown api", path: "/api/unknown", expectedStatus: 404 },
  { name: "channels auth", path: "/api/channels", expectedStatus: 401 },
  {
    name: "agent auth",
    method: "POST",
    path: "/api/agent/chat",
    body: { message: "ping" },
    expectedStatus: 401,
  },
  {
    name: "scrape validation",
    method: "POST",
    path: "/api/scrape",
    body: {},
    expectedStatus: 400,
  },
  {
    name: "cors preflight",
    method: "OPTIONS",
    path: "/api/agent/chat",
    expectedStatus: 204,
    expectHeader: ["Access-Control-Allow-Origin", "*"],
  },
];

async function main() {
  const failures: string[] = [];
  for (const check of checks) {
    const result = await runCheck(check);
    console.log(`${result.ok ? "ok" : "fail"}   ${check.name} - ${result.detail}`);
    if (!result.ok) failures.push(check.name);
  }

  if (failures.length) {
    console.log(`\n${failures.length} worker smoke check(s) failed.`);
    process.exit(1);
  }
}

async function runCheck(check: SmokeCheck): Promise<{ ok: boolean; detail: string }> {
  let response: Response | null = null;
  try {
    const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    response = await fetch(`${baseUrl}${check.path}`, {
      method: check.method ?? "GET",
      headers: check.body ? { "Content-Type": "application/json" } : undefined,
      body: check.body ? JSON.stringify(check.body) : undefined,
      redirect: "manual",
      signal,
    });

    if (response.status !== check.expectedStatus) {
      return { ok: false, detail: `expected ${check.expectedStatus}, got ${response.status}` };
    }

    if (check.expectHeader) {
      const [name, expected] = check.expectHeader;
      const actual = response.headers.get(name);
      if (actual !== expected) {
        return { ok: false, detail: `expected ${name}: ${expected}, got ${actual ?? "missing"}` };
      }
    }

    return { ok: true, detail: `${response.status}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    return { ok: false, detail: message };
  } finally {
    await response?.body?.cancel().catch(() => undefined);
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

main();
