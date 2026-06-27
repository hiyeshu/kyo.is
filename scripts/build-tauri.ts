#!/usr/bin/env bun
/**
 * [INPUT]: 依赖 child_process.execSync，设置 TAURI_ENV=1
 * [OUTPUT]: 执行 TypeScript 编译与 Vite 构建，生成 Tauri 桌面壳前端资产
 * [POS]: scripts/ 的桌面构建入口，被 package.json build:tauri 调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { execSync } from "child_process";

// Set environment variable for Tauri build
process.env.TAURI_ENV = "1";

// Run TypeScript compilation and Vite build for the desktop shell.
execSync("bun run tsc -b && vite build", {
  stdio: "inherit",
  env: { ...process.env, TAURI_ENV: "1" },
});
