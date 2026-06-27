#!/usr/bin/env bun
/**
 * [INPUT]: 依赖 fs/path/child_process，读取 .dev.vars 或 .env.local 的 Worker 环境变量
 * [OUTPUT]: 调用 wrangler secret put 配置 Cloudflare Worker 运行时变量，不打印密钥值
 * [POS]: scripts/ 的 Cloudflare 环境配置器，被 package.json configure:cloudflare-env 调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const ENV_FILES = [".dev.vars", ".env.local"];
const REQUIRED_KEYS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "DEEPSEEK_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function main() {
  const env = readEnvFiles();
  const missing = REQUIRED_KEYS.filter((key) => !env.get(key));
  if (missing.length) {
    console.error(`Missing env value(s): ${missing.join(", ")}`);
    process.exit(1);
  }

  for (const key of REQUIRED_KEYS) {
    putSecret(key, env.get(key) ?? "");
  }
}

function readEnvFiles(): Map<string, string> {
  const values = new Map<string, string>();
  for (const file of ENV_FILES) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;

    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match?.[1]) continue;
      values.set(match[1], stripQuotes(match[2] ?? ""));
    }
  }
  return values;
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function putSecret(key: string, value: string) {
  console.log(`setting ${key}`);
  const result = spawnSync("bunx", ["wrangler", "secret", "put", key], {
    cwd: ROOT,
    input: `${value}\n`,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    process.stdout.write(redactOutput(result.stdout));
    process.stderr.write(redactOutput(result.stderr));
    process.exit(result.status ?? 1);
  }
}

function redactOutput(output: string): string {
  return output.replace(/("[^"]{8,}")/g, '"(hidden)"');
}

main();
