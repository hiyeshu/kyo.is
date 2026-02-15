/**
 * Generates a version.json file with build information
 * Format: MAJOR.MINOR.PATCH (e.g., 1.0.1) + commit SHA
 *
 * Version is auto-incremented by pre-commit hook (scripts/bump-patch.sh).
 * Uses VERCEL_GIT_COMMIT_SHA in production builds, falls back to 'dev' locally.
 */

import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ============================================================================
// VERSION CONSTANTS - Auto-bumped by pre-commit hook
// ============================================================================
const MAJOR = 1;
const MINOR = 0;
const PATCH = 53;
// ============================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicVersionPath = join(__dirname, '../public/version.json');

// Get commit SHA from environment or git
let commitSha = process.env.VERCEL_GIT_COMMIT_SHA || '';

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
