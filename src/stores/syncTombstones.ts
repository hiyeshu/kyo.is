/**
 * [INPUT]: 依赖浏览器 localStorage 与 Date.now
 * [OUTPUT]: 删除 tombstone 读写工具，提供 trackDeletionTombstone / getDeletedIds / shouldRejectRemoteItemChange
 * [POS]: stores/ 的同步删除记忆层，被 useSyncStore 消费，阻止迟到 Realtime 写入复活已删除条目
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const DELETED_IDS_KEY = "kyo:deleted-ids";

const TOMBSTONE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type TombstoneMap = Record<string, number>;

export function trackDeletionTombstone(id: string, now = Date.now()): void {
  const tombstones = readDeletionTombstones(now);
  tombstones[id] = now;
  writeDeletionTombstones(tombstones);
}

export function getDeletedIds(now = Date.now()): Set<string> {
  return new Set(Object.keys(readDeletionTombstones(now)));
}

export function shouldRejectRemoteItemChange(id: string | undefined, now = Date.now()): boolean {
  return Boolean(id && getDeletedIds(now).has(id));
}

export function pruneDeletionTombstones(now = Date.now()): void {
  readDeletionTombstones(now);
}

function readDeletionTombstones(now: number): TombstoneMap {
  const raw = localStorage.getItem(DELETED_IDS_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    const tombstones = normalizeTombstones(parsed, now);
    writeDeletionTombstones(tombstones);
    return tombstones;
  } catch {
    localStorage.removeItem(DELETED_IDS_KEY);
    return {};
  }
}

function normalizeTombstones(value: unknown, now: number): TombstoneMap {
  const entries = Array.isArray(value)
    ? value.map((id) => [id, now] as const)
    : Object.entries((value ?? {}) as Record<string, unknown>);

  return Object.fromEntries(
    entries.filter(([id, deletedAt]) => {
      if (typeof id !== "string") return false;
      if (typeof deletedAt !== "number") return false;
      return now - deletedAt < TOMBSTONE_TTL_MS;
    })
  );
}

function writeDeletionTombstones(tombstones: TombstoneMap): void {
  const ids = Object.keys(tombstones);
  if (ids.length === 0) {
    localStorage.removeItem(DELETED_IDS_KEY);
    return;
  }
  localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(tombstones));
}
