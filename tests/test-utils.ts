#!/usr/bin/env bun
/**
 * [INPUT]: 依赖 process.env.API_URL / KYO_BASE_URL 与 fetch
 * [OUTPUT]: BASE_URL、断言函数、fetch helper、测试结果汇总工具
 * [POS]: tests/ 的共享测试工具，被 Worker API 测试套件消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const BASE_URL = normalizeBaseUrl(
  process.env.API_URL ?? process.env.KYO_BASE_URL ?? "http://127.0.0.1:8787"
);

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export const results: TestResult[] = [];

export async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`  ok   ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: message, duration: Date.now() - start });
    console.log(`  fail ${name}`);
    console.log(`       ${message}`);
  }
}

export function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export function assertEq<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

export function printSummary(): { passed: number; failed: number } {
  const passed = results.filter((result) => result.passed).length;
  const failed = results.filter((result) => !result.passed).length;
  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

export function clearResults(): void {
  results.length = 0;
}

export function section(text: string): string {
  return `\n--- ${text} ---`;
}

export async function fetchWithOrigin(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (!headers.has("Origin")) headers.set("Origin", "http://localhost:5173");
  return fetch(url, { ...options, headers });
}

export async function fetchWithBearer(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set("Origin", "http://localhost:5173");
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...options, headers });
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}
