// Suppression / Do-Not-Contact list. Single source of truth for whether a
// lead can be contacted or exported for outreach.

import type { DataSnapshot, Lead, Suppression } from "@/types";
import { extractDomain } from "@/lib/utils/string";
import { nid, nowIso } from "@/lib/utils/id";

export function isSuppressed(
  lead: Pick<Lead, "email" | "website">,
  suppressions: Suppression[],
): { suppressed: boolean; matched?: Suppression } {
  const email = (lead.email ?? "").trim().toLowerCase();
  const domain = extractDomain(lead.website ?? lead.email ?? "");
  for (const s of suppressions) {
    if (s.email && email && s.email.toLowerCase() === email) {
      return { suppressed: true, matched: s };
    }
    if (s.domain && domain && s.domain.toLowerCase() === domain) {
      return { suppressed: true, matched: s };
    }
  }
  return { suppressed: false };
}

export function buildSuppression(args: {
  ownerId: string;
  email?: string | null;
  domain?: string | null;
  reason?: string | null;
}): Suppression {
  return {
    id: nid("sup"),
    owner_id: args.ownerId,
    email: args.email ?? null,
    domain: args.domain ?? null,
    reason: args.reason ?? null,
    created_at: nowIso(),
  };
}

export interface ExportSafetyReport {
  total: number;
  suppressed: number;
  doNotContactStatus: number;
  safeToExport: number;
}

export function reviewLeadsForExport(
  leads: Lead[],
  snapshot: Pick<DataSnapshot, "suppressions">,
): ExportSafetyReport {
  let suppressed = 0;
  let doNotContact = 0;
  for (const lead of leads) {
    const sup = isSuppressed(lead, snapshot.suppressions);
    if (sup.suppressed) suppressed++;
    if (lead.status === "do_not_contact") doNotContact++;
  }
  const blocked = leads.filter(
    (l) => l.is_suppressed || l.status === "do_not_contact",
  ).length;
  return {
    total: leads.length,
    suppressed,
    doNotContactStatus: doNotContact,
    safeToExport: leads.length - blocked,
  };
}
