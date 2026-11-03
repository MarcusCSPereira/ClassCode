import { initialState, STORAGE_KEY } from '../lib/domain';
import type { DemoState, DemoStateV1, HintOrdinal } from '../lib/types';

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;
export interface DemoStore {
  getSnapshot(): DemoState;
  subscribe(listener: () => void): () => void;
  update(change: (state: DemoState) => DemoState): void;
  /** True once the browser refused to save; changes then last only while the page is open. */
  storageError(): boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
function hasCommonFields(value: Record<string, unknown>) {
  return (
    ['student', 'teacher'].includes(value.role as string) &&
    typeof value.name === 'string' &&
    Array.isArray(value.classes) &&
    Array.isArray(value.joinedClassIds) &&
    Array.isArray(value.customProblems) &&
    isRecord(value.startedAt) &&
    isRecord(value.drafts)
  );
}
const HINT_DELAYS = [180, 420, 720];
/** v1 kept no view or report times; use the earliest possible view and the migration time. */
function migrateV1(v1: DemoStateV1, now: number): DemoState {
  const hintViews: DemoState['hintViews'] = {};
  for (const [problemId, indexes] of Object.entries(v1.revealedHints))
    hintViews[problemId] = [...new Set(indexes)]
      .filter((i) => i >= 0 && i < 3)
      .sort((a, b) => a - b)
      .map((i) => ({
        ordinal: (i + 1) as HintOrdinal,
        viewedAt: Math.min(now, (v1.startedAt[problemId] ?? now) + HINT_DELAYS[i] * 1000),
      }));
  const reports: DemoState['reports'] = {};
  for (const problemId of v1.solved)
    reports[problemId] = { evidence: v1.evidence[problemId] ?? '', reportedAt: now };
  return {
    version: 2,
    role: v1.role,
    name: v1.name,
    joinedClassIds: v1.joinedClassIds,
    joinedAt: Object.fromEntries(v1.joinedClassIds.map((id) => [id, now])),
    classes: v1.classes,
    customProblems: v1.customProblems,
    startedAt: v1.startedAt,
    drafts: v1.drafts,
    hintViews,
    reports,
  };
}
/** Accepts a saved v2 state, migrates a v1 state, and rejects anything else. */
export function parseDemoState(value: unknown, now: number): DemoState | null {
  if (!isRecord(value) || !hasCommonFields(value)) return null;
  if (
    value.version === 2 &&
    isRecord(value.joinedAt) &&
    isRecord(value.hintViews) &&
    isRecord(value.reports)
  )
    return value as unknown as DemoState;
  if (
    value.version === 1 &&
    Array.isArray(value.solved) &&
    isRecord(value.revealedHints) &&
    isRecord(value.evidence)
  )
    return migrateV1(value as unknown as DemoStateV1, now);
  return null;
}
export function browserStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
export function createDemoStore(storage: KeyValueStorage | null, now = Date.now): DemoStore {
  let state = initialState(now());
  try {
    state = parseDemoState(JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null'), now()) ?? state;
  } catch {
    /* Storage is optional for the demo. */
  }
  let failed = false;
  const listeners = new Set<() => void>();
  function persist() {
    try {
      if (!storage) throw new Error('storage unavailable');
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      failed = true;
    }
  }
  persist();
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(change) {
      const next = change(state);
      if (next === state) return;
      state = next;
      persist();
      listeners.forEach((listener) => listener());
    },
    storageError: () => failed,
  };
}
