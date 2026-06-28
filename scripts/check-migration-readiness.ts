#!/usr/bin/env bun
/**
 * [INPUT]: 依赖 fs/path/process，读取 wrangler.jsonc、package.json、env 文件、public/dist/supabase/src
 * [OUTPUT]: 输出 Cloudflare + Supabase + Mastra 迁移门禁结果，包含 agent 工具契约测试白名单，失败时 exit 1
 * [POS]: scripts/ 的迁移发布前检查器，被 package.json check:migration 调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = process.cwd();
const MiB = 1024 * 1024;
const LEGACY_HOST = ["ver", "cel"].join("");

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

type JsonObject = Record<string, unknown>;

interface PackageJson extends JsonObject {
  scripts?: Record<string, string>;
}

interface WranglerConfig extends JsonObject {
  name?: string;
  account_id?: string;
  main?: string;
  compatibility_flags?: unknown[];
  assets?: {
    directory?: string;
    binding?: string;
    run_worker_first?: boolean;
  };
}

const checks: Check[] = [];

function main() {
  checkWranglerConfig();
  checkPackageScripts();
  checkEnvNames();
  checkMigrations();
  checkStaticAssets();
  checkTests();
  checkDependencyTruthSource();
  checkLegacyFiles();
  checkForbiddenText();
  report();
}

function checkWranglerConfig() {
  const config = readJson<WranglerConfig>("wrangler.jsonc");
  const flags = Array.isArray(config.compatibility_flags) ? config.compatibility_flags : [];
  const assets = config.assets ?? {};

  add("wrangler name", config.name === "kyo-is", "name must be kyo-is");
  add("wrangler account", Boolean(config.account_id), "account_id must be pinned");
  add("worker entry", config.main === "src/worker/index.ts", "main must point at Worker entry");
  add("nodejs compat", flags.includes("nodejs_compat"), "nodejs_compat required for AI/Mastra deps");
  add("static assets", assets.directory === "./dist" && assets.binding === "ASSETS", "ASSETS -> ./dist");
  add("worker first", assets.run_worker_first === true, "Worker must own API and SPA fallback");
}

function checkPackageScripts() {
  const pkg = readJson<PackageJson>("package.json");
  const scripts = pkg.scripts ?? {};
  add("build script", scripts.build === "tsc -b && vite build", "build must produce dist");
  add("cloudflare preview", Boolean(scripts["preview:cloudflare"]), "preview:cloudflare required");
  add("cloudflare deploy", Boolean(scripts["deploy:cloudflare"]), "deploy:cloudflare required");
  add("migration preflight", Boolean(scripts["check:migration"]), "check:migration required");
  add("worker types", Boolean(scripts["types:worker"]), "types:worker must regenerate Worker env types");
  add("worker tests", scripts.test === "bun run tests/run-all-tests.ts", "test must run agent tool and Worker API tests");
}

function checkEnvNames() {
  const env = loadEnvNames([".dev.vars", ".env.local"]);
  const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "DEEPSEEK_API_KEY"];
  for (const key of required) {
    add(`env ${key}`, env.has(key), `${key} must exist in .dev.vars or .env.local`);
  }
  add(
    "env SUPABASE_SERVICE_ROLE_KEY",
    env.has("SUPABASE_SERVICE_ROLE_KEY"),
    "required for link_meta cache writes"
  );
}

function checkMigrations() {
  const files = listFiles("supabase/migrations").map((file) => file.replace(/\\/g, "/"));
  add(
    "agent workspace migration",
    files.includes("supabase/migrations/20260627000000_agent_workspace.sql"),
    "base agent/channel/workspace schema required"
  );
  add(
    "policy hardening migration",
    files.includes("supabase/migrations/20260627035557_harden_agent_workspace_policies.sql"),
    "public policy cleanup required"
  );
  add(
    "channel scope migration",
    files.includes("supabase/migrations/20260627041016_harden_channel_scope.sql"),
    "message/run rows must point at same-user channels"
  );
  add(
    "function search_path migration",
    files.includes("supabase/migrations/20260627043503_harden_function_search_path.sql"),
    "public functions must pin search_path"
  );
  add(
    "agent indexes migration",
    files.includes("supabase/migrations/20260627043821_harden_agent_indexes.sql"),
    "agent foreign keys and bookmark dedupe indexes required"
  );
}

function checkStaticAssets() {
  const tooLarge = [...listFiles("public"), ...listFiles("dist")]
    .map((file) => ({ file, size: statSync(join(ROOT, file)).size }))
    .filter((entry) => entry.size > 25 * MiB);

  add(
    "cloudflare asset size",
    tooLarge.length === 0,
    tooLarge.length ? tooLarge.map((entry) => entry.file).join(", ") : "all files <= 25 MiB"
  );
}

function checkTests() {
  const files = listFiles("tests").map((file) => file.replace(/\\/g, "/"));
  const allowed = [
    "tests/CLAUDE.md",
    "tests/run-all-tests.ts",
    "tests/test-kyo-item-tools.ts",
    "tests/test-utils.ts",
    "tests/test-worker-api.ts",
  ];
  const extra = files.filter((file) => !allowed.includes(file));
  add("worker test suite", files.includes("tests/test-worker-api.ts"), "Worker API tests required");
  add("removed legacy API tests", extra.length === 0, extra.length ? extra.join(", ") : "no legacy test files");
}

function checkDependencyTruthSource() {
  add("bun lockfile", existsSync(join(ROOT, "bun.lock")), "bun.lock must be the dependency lockfile");
  add("removed package-lock", !existsSync(join(ROOT, "package-lock.json")), "package-lock.json must not exist");
  add("removed bun lockb", !existsSync(join(ROOT, "bun.lockb")), "legacy binary bun.lockb must not exist");
}

function checkLegacyFiles() {
  const legacyFiles = [`${LEGACY_HOST}.json`, `${"middleware"}.ts`, "API_CLAUDE.md"];
  for (const file of legacyFiles) {
    add(`removed ${file}`, !existsSync(join(ROOT, file)), `${file} must not exist`);
  }
  add("removed api directory", !existsSync(join(ROOT, "api")), "legacy serverless API directory removed");
  add(
    "removed legacy seed script",
    !existsSync(join(ROOT, "scripts/seed-dev-users.ts")),
    "legacy Redis chat-room seed script removed"
  );
}

function checkForbiddenText() {
  const files = [
    ...listFiles("src"),
    ...listFiles("scripts"),
    ...listFiles("docs"),
    "package.json",
    "vite.config.ts",
    "wrangler.jsonc",
  ].filter((file) => file !== "scripts/check-migration-readiness.ts" && !file.includes("/locales/"));

  const patterns = [
    new RegExp(`${"di"}${"fy"}`, "i"),
    new RegExp(`vite-plugin-${LEGACY_HOST}`),
    new RegExp(`@${LEGACY_HOST}/`),
    new RegExp(`VITE_${"VERCEL"}_ENV`),
  ];
  const hits: string[] = [];
  for (const file of files) {
    const content = readFileSync(join(ROOT, file), "utf8");
    if (patterns.some((pattern) => pattern.test(content))) hits.push(file);
  }
  add("legacy provider text", hits.length === 0, hits.length ? hits.join(", ") : "no legacy provider residue");
}

function add(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
}

function report() {
  for (const check of checks) {
    const mark = check.ok ? "ok" : "fail";
    console.log(`${mark.padEnd(4)} ${check.name} - ${check.detail}`);
  }

  const failed = checks.filter((check) => !check.ok);
  if (failed.length) {
    console.log(`\n${failed.length} migration readiness check(s) failed.`);
    process.exit(1);
  }
}

function readJson<T extends JsonObject>(pathname: string): T {
  return JSON.parse(readFileSync(join(ROOT, pathname), "utf8")) as T;
}

function loadEnvNames(files: string[]): Set<string> {
  const keys = new Set<string>();
  for (const file of files) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;
    const lines = readFileSync(path, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=/);
      if (match?.[1]) keys.add(match[1]);
    }
  }
  return keys;
}

function listFiles(dir: string): string[] {
  const root = join(ROOT, dir);
  if (!existsSync(root)) return [];
  const output: string[] = [];
  walk(root, output);
  return output.map((file) => relative(ROOT, file));
}

function walk(dir: string, output: string[]) {
  for (const name of readdirSync(dir)) {
    if (shouldSkip(name)) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, output);
      continue;
    }
    output.push(path);
  }
}

function shouldSkip(name: string): boolean {
  return [".git", ".wrangler", "node_modules", "dist-ssr"].includes(name);
}

main();
