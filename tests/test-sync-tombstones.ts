#!/usr/bin/env bun
/**
 * [INPUT]: 依赖 stores/syncTombstones 与 ./test-utils
 * [OUTPUT]: runSyncTombstoneTests，验证删除 tombstone 的迁移、TTL 与远端变更拦截策略
 * [POS]: tests/ 的同步删除回归套件，防止 Realtime/merge 复活已删除 kyo_items
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import {
  DELETED_IDS_KEY,
  getDeletedIds,
  pruneDeletionTombstones,
  shouldRejectRemoteItemChange,
  trackDeletionTombstone,
} from "../src/stores/syncTombstones";
import { assert, assertEq, clearResults, printSummary, runTest, section } from "./test-utils";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function runSyncTombstoneTests(): Promise<{ passed: number; failed: number }> {
  console.log(section("Sync Tombstones"));
  clearResults();
  installMemoryStorage();

  await runTest("legacy deleted-id array rejects remote changes", async () => {
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(["dead-note"]));

    assert(shouldRejectRemoteItemChange("dead-note", 1_000), "Expected old tombstone to reject remote change");
    assertEq(shouldRejectRemoteItemChange("other-note", 1_000), false);

    const stored = JSON.parse(localStorage.getItem(DELETED_IDS_KEY) ?? "{}") as Record<string, number>;
    assertEq(stored["dead-note"], 1_000);
  });

  await runTest("tombstone survives until ttl expires", async () => {
    localStorage.clear();
    trackDeletionTombstone("deleted-note", 10_000);

    pruneDeletionTombstones(10_000 + 6 * DAY_MS);
    assert(getDeletedIds(10_000 + 6 * DAY_MS).has("deleted-note"), "Expected tombstone before TTL");

    pruneDeletionTombstones(10_000 + 8 * DAY_MS);
    assertEq(getDeletedIds(10_000 + 8 * DAY_MS).has("deleted-note"), false);
  });

  return printSummary();
}

function installMemoryStorage(): void {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    clear: () => {
      values.clear();
    },
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
}

if (import.meta.main) {
  runSyncTombstoneTests().then(({ failed }) => process.exit(failed > 0 ? 1 : 0));
}
