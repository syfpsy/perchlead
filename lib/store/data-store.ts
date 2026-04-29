// Local data store: a single in-memory snapshot persisted to localStorage on
// the client and seeded with demo data on first load.
//
// It intentionally exposes a small CRUD surface so that swapping it for a
// Neon-backed store later is a one-file change. Services in
// /lib/services/* depend on this module and nothing else.

"use client";

import type { DataSnapshot, ID } from "@/types";
import { buildSeed } from "@/lib/seed/demo-data";

export type { DataSnapshot };

const STORAGE_KEY = "perchlead.store.v1";
const DEMO_OWNER_ID: ID = "user_demo";

let snapshot: DataSnapshot | null = null;
const subscribers = new Set<() => void>();

function emptySnapshot(): DataSnapshot {
  return {
    schema_version: 1,
    current_user: {
      id: DEMO_OWNER_ID,
      email: "demo@perchlead.app",
      full_name: "Demo Founder",
      created_at: new Date().toISOString(),
    },
    users: [],
    leads: [],
    companies: [],
    sources: [],
    products: [],
    product_interests: [],
    tags: [],
    interactions: [],
    tasks: [],
    lists: [],
    suppressions: [],
    audit_logs: [],
    imports: [],
    import_rows: [],
    email_templates: [],
  };
}

function loadFromStorage(): DataSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DataSnapshot;
    if (parsed.schema_version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist() {
  if (typeof window === "undefined" || !snapshot) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Quota or disabled storage — ignore. State stays in-memory for the session.
  }
}

function ensureLoaded(): DataSnapshot {
  if (snapshot) return snapshot;
  const fromStorage = loadFromStorage();
  if (fromStorage) {
    snapshot = fromStorage;
    return snapshot;
  }
  const seeded = buildSeed(emptySnapshot());
  snapshot = seeded;
  persist();
  return snapshot;
}

function notify() {
  for (const cb of subscribers) cb();
}

export const store = {
  get(): DataSnapshot {
    return ensureLoaded();
  },
  ownerId(): ID {
    return ensureLoaded().current_user.id;
  },
  subscribe(cb: () => void): () => void {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  },
  /**
   * Mutate the snapshot transactionally. The mutator receives a draft (the
   * live object — kept simple to avoid an immer dependency) and may return
   * void or a value. Callers use this to keep UI updates atomic.
   */
  update<T>(mutator: (draft: DataSnapshot) => T): T {
    const s = ensureLoaded();
    const result = mutator(s);
    // Bump the top-level reference so useSyncExternalStore re-renders.
    // Inner arrays are intentionally shared — services mutate them in place
    // and we treat the snapshot as a single revision-clocked tree.
    snapshot = { ...s };
    persist();
    notify();
    return result;
  },
  reset(seed: boolean) {
    snapshot = seed ? { ...buildSeed(emptySnapshot()) } : { ...emptySnapshot() };
    persist();
    notify();
  },
  exportJson(): string {
    return JSON.stringify(ensureLoaded(), null, 2);
  },
};
