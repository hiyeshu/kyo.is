/**
 * [INPUT]: 依赖 ./types 的 KyoWorkerEnv
 * [OUTPUT]: json / errorJson / withCors / readBearerToken / requireEnv 工具函数
 * [POS]: server/ 的 HTTP 边界工具，被 Cloudflare Worker 路由统一使用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { KyoWorkerEnv } from "./types";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

export function json(data: unknown, status = 200): Response {
  return withCors(
    new Response(JSON.stringify(data), {
      status,
      headers: JSON_HEADERS,
    })
  );
}

export function errorJson(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function optionsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export function readBearerToken(request: Request): string | null {
  const value = request.headers.get("Authorization");
  if (!value?.startsWith("Bearer ")) return null;
  return value.slice("Bearer ".length).trim() || null;
}

export function requireEnv(env: KyoWorkerEnv, key: keyof KyoWorkerEnv): string {
  const value = env[key];
  if (typeof value !== "string" || !value) {
    throw new Error(`Missing ${String(key)}`);
  }
  return value;
}
