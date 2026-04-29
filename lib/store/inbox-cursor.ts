// Shared "current inbox order" for j/k navigation on the profile.
// The inbox writes its filtered+sorted lead IDs here; the profile reads them
// to figure out what "next" and "previous" mean. Plain localStorage so it
// survives navigation but doesn't bloat the data store.

"use client";

const KEY = "perchlead.inbox_cursor.v1";

export interface InboxCursor {
  ids: string[];
  /** Free-text label to surface "12 of 47 in 'Motion studios'" on the profile. */
  label?: string;
  saved_at: string;
}

export function writeInboxCursor(cursor: Omit<InboxCursor, "saved_at">) {
  if (typeof window === "undefined") return;
  try {
    const payload: InboxCursor = { ...cursor, saved_at: new Date().toISOString() };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* noop */
  }
}

export function readInboxCursor(): InboxCursor | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InboxCursor;
  } catch {
    return null;
  }
}

export function getNeighbors(
  cursor: InboxCursor | null,
  currentId: string,
): { prev?: string; next?: string; index?: number; total?: number } {
  if (!cursor) return {};
  const idx = cursor.ids.indexOf(currentId);
  if (idx === -1) return {};
  return {
    prev: idx > 0 ? cursor.ids[idx - 1] : undefined,
    next: idx < cursor.ids.length - 1 ? cursor.ids[idx + 1] : undefined,
    index: idx,
    total: cursor.ids.length,
  };
}
