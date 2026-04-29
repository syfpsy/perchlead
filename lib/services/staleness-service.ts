// SLA / staleness signals on leads. Pure functions over the snapshot's
// already-built LeadRow[]. Drives the "Stale" inbox view, dashboard KPI,
// and the upcoming digest job.
//
// Rules (tunable; export so future settings UI can override):
// - new      → stale after 14d without an interaction
// - cleaned  → stale after 14d
// - enriched → stale after 14d
// - qualified → stale after 7d
// - contacted → stale after 4d (waiting on a reply)
// - replied  → stale after 2d (we owe a follow-up)
// - converted / rejected / do_not_contact → never stale (terminal)

import type { LeadRow, LeadStatus } from "@/types";

export const STALE_AFTER_DAYS: Partial<Record<LeadStatus, number>> = {
  new: 14,
  cleaned: 14,
  enriched: 14,
  qualified: 7,
  contacted: 4,
  replied: 2,
};

export interface StaleResult {
  isStale: boolean;
  daysSince: number;
  threshold?: number;
  reason?: string;
}

export function leadStaleness(row: LeadRow, now = Date.now()): StaleResult {
  const status = row.lead.status;
  const threshold = STALE_AFTER_DAYS[status];
  const since = row.last_interaction_at ?? row.lead.updated_at ?? row.lead.created_at;
  const daysSince = Math.floor((now - new Date(since).getTime()) / 86400000);
  if (threshold == null) {
    return { isStale: false, daysSince };
  }
  if (daysSince < threshold) {
    return { isStale: false, daysSince, threshold };
  }
  return {
    isStale: true,
    daysSince,
    threshold,
    reason: reasonFor(status, daysSince, threshold),
  };
}

export function findStale(rows: LeadRow[], now = Date.now()): LeadRow[] {
  return rows
    .map((r) => ({ row: r, s: leadStaleness(r, now) }))
    .filter((x) => x.s.isStale)
    .sort((a, b) => b.s.daysSince - a.s.daysSince)
    .map((x) => x.row);
}

function reasonFor(status: LeadStatus, daysSince: number, threshold: number): string {
  if (status === "contacted") return `Contacted ${daysSince}d ago, no reply (SLA ${threshold}d).`;
  if (status === "replied") return `Replied ${daysSince}d ago, you owe a follow-up (SLA ${threshold}d).`;
  if (status === "qualified") return `Qualified ${daysSince}d ago, push to contacted (SLA ${threshold}d).`;
  return `Idle for ${daysSince}d (SLA ${threshold}d).`;
}
