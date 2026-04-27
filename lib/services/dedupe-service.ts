// Duplicate detection. Pure functions over a leads array — keeps the
// service usable from both import preview and the merge UI.

import type { Company, Lead } from "@/types";
import {
  extractDomain,
  normalizeCompanyName,
  normalizeEmail,
  similarity,
} from "@/lib/utils/string";

export type DuplicateReason =
  | "exact_email"
  | "normalized_email"
  | "same_domain_similar_name"
  | "same_website"
  | "fuzzy_name_company";

export interface DuplicateCandidate {
  lead: Lead;
  reason: DuplicateReason;
  confidence: number; // 0..1
  detail: string;
}

interface Context {
  leads: Lead[];
  companies: Company[];
}

interface CandidateInput {
  email?: string | null;
  name?: string | null;
  website?: string | null;
  company_name?: string | null;
}

export function findDuplicates(input: CandidateInput, ctx: Context): DuplicateCandidate[] {
  const { leads, companies } = ctx;
  const out: DuplicateCandidate[] = [];

  const inEmailRaw = (input.email ?? "").trim().toLowerCase();
  const inEmailNorm = normalizeEmail(input.email);
  const inDomain = extractDomain(input.website ?? input.email ?? "");
  const inCompanyNorm = normalizeCompanyName(input.company_name);
  const inName = (input.name ?? "").trim().toLowerCase();

  const seen = new Set<string>();
  const push = (c: DuplicateCandidate) => {
    if (seen.has(c.lead.id)) return;
    seen.add(c.lead.id);
    out.push(c);
  };

  for (const lead of leads) {
    const leadEmailRaw = (lead.email ?? "").trim().toLowerCase();
    if (inEmailRaw && leadEmailRaw && inEmailRaw === leadEmailRaw) {
      push({ lead, reason: "exact_email", confidence: 1, detail: "Identical email address." });
      continue;
    }

    if (inEmailNorm && normalizeEmail(lead.email) && inEmailNorm === normalizeEmail(lead.email)) {
      push({
        lead,
        reason: "normalized_email",
        confidence: 0.95,
        detail: "Same email after normalization (gmail dots, +tags).",
      });
      continue;
    }

    const leadDomain = extractDomain(lead.website ?? lead.email ?? "");
    if (inDomain && leadDomain && inDomain === leadDomain && inDomain.includes(".")) {
      const leadName = lead.name.toLowerCase();
      if (inName && leadName && similarity(inName, leadName) > 0.6) {
        push({
          lead,
          reason: "same_domain_similar_name",
          confidence: 0.85,
          detail: `Same domain (${inDomain}) and similar name.`,
        });
        continue;
      }
      push({
        lead,
        reason: "same_website",
        confidence: 0.6,
        detail: `Same domain (${inDomain}).`,
      });
      continue;
    }

    if (inCompanyNorm) {
      const company = companies.find((c) => c.id === lead.company_id);
      const leadCompanyNorm = normalizeCompanyName(company?.name);
      if (leadCompanyNorm && inCompanyNorm === leadCompanyNorm && inName) {
        const leadName = lead.name.toLowerCase();
        const sim = similarity(inName, leadName);
        if (sim > 0.7) {
          push({
            lead,
            reason: "fuzzy_name_company",
            confidence: 0.7 + sim * 0.2,
            detail: `Same company "${company?.name}" with very similar contact name.`,
          });
        }
      }
    }
  }

  return out.sort((a, b) => b.confidence - a.confidence);
}

/** Keep the higher-quality lead and merge missing fields from the loser. */
export function mergeLeads(winner: Lead, loser: Lead): Lead {
  return {
    ...winner,
    email: winner.email ?? loser.email,
    phone: winner.phone ?? loser.phone,
    title: winner.title ?? loser.title,
    company_id: winner.company_id ?? loser.company_id,
    website: winner.website ?? loser.website,
    linkedin_url: winner.linkedin_url ?? loser.linkedin_url,
    location: winner.location ?? loser.location,
    notes: [winner.notes, loser.notes].filter(Boolean).join("\n\n---\n\n") || null,
    tag_ids: Array.from(new Set([...(winner.tag_ids ?? []), ...(loser.tag_ids ?? [])])),
    updated_at: new Date().toISOString(),
  };
}
