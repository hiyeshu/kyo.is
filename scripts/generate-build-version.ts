/**
 * [INPUT]: 依赖 git rev-parse 与 WORKERS_CI_COMMIT_SHA / VERCEL_GIT_COMMIT_SHA 环境变量。
 * [OUTPUT]: 写入 public/version.json，提供 MAJOR.MINOR.PATCH、短提交号与构建时间。
 * [POS]: scripts/ 的版本写入器，被 prebuild 与发布流水线调用。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ============================================================================
// VERSION CONSTANTS - Auto-bumped by pre-commit hook
// ============================================================================
const MAJOR = 1;
const MINOR = 1;
const PATCH = 83;
// ============================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicVersionPath = join(__dirname, '../public/version.json');

// Get commit SHA from environment or git
let commitSha =
  process.env.WORKERS_CI_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '';

if (!commitSha) {
  try {
    commitSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    commitSha = 'dev';
  }
}

const shortSha = commitSha === 'dev' ? 'dev' : commitSha.substring(0, 7);
const buildTime = new Date().toISOString();
const version = `${MAJOR}.${MINOR}.${PATCH}`;

const versionJson = {
  version,
  buildNumber: shortSha,
  commitSha,
  buildTime,
};

writeFileSync(publicVersionPath, JSON.stringify(versionJson, null, 2));

console.log(`[Build] version: ${version} (${shortSha}) at ${buildTime}`);
