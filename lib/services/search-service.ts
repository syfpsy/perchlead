// Local search + filter implementation. Mirrors what a server-side
// PostgreSQL full-text search would return — returns LeadRow[] so the inbox
// can render directly.

import type {
  Company,
  DataSnapshot,
  Lead,
  LeadFilters,
  LeadProductInterest,
  LeadRow,
  Product,
  Source,
  Tag,
} from "@/types";

export function buildLeadRows(snapshot: DataSnapshot): LeadRow[] {
  const tagMap = new Map(snapshot.tags.map((t) => [t.id, t]));
  const productMap = new Map(snapshot.products.map((p) => [p.id, p]));
  const interestsByLead = groupBy(snapshot.product_interests, (i) => i.lead_id);
  const lastInteractionByLead = new Map<string, string>();
  for (const itx of snapshot.interactions) {
    const prev = lastInteractionByLead.get(itx.lead_id);
    if (!prev || prev < itx.happened_at) {
      lastInteractionByLead.set(itx.lead_id, itx.happened_at);
    }
  }
  const companyById = new Map(snapshot.companies.map((c) => [c.id, c]));
  const sourceById = new Map(snapshot.sources.map((s) => [s.id, s]));

  return snapshot.leads.map<LeadRow>((lead) => {
    const company = lead.company_id ? companyById.get(lead.company_id) ?? null : null;
    const source = lead.source_id ? sourceById.get(lead.source_id) ?? null : null;
    const tags = (lead.tag_ids ?? [])
      .map((id) => tagMap.get(id))
      .filter((t): t is Tag => Boolean(t));
    const interests = (interestsByLead.get(lead.id) ?? [])
      .map((interest) => {
        const product = productMap.get(interest.product_id);
        return product ? { product, interest } : null;
      })
      .filter((x): x is { product: Product; interest: LeadProductInterest } => Boolean(x));
    return {
      lead,
      company,
      source,
      tags,
      interests,
      last_interaction_at: lastInteractionByLead.get(lead.id) ?? null,
      next_action: lead.score_reason?.next_action ?? "Review.",
    };
  });
}

export function applyFilters(rows: LeadRow[], filters: LeadFilters): LeadRow[] {
  const q = (filters.query ?? "").trim().toLowerCase();
  return rows.filter((row) => {
    const { lead, company, source, tags, interests } = row;

    if (q.length) {
      const haystack = [
        lead.name,
        lead.email,
        lead.title,
        lead.location,
        lead.notes,
        company?.name,
        company?.domain,
        source?.name,
        ...tags.map((t) => t.name),
        ...interests.map((i) => i.product.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (filters.statuses?.length && !filters.statuses.includes(lead.status)) return false;
    if (filters.tag_ids?.length) {
      const set = new Set(filters.tag_ids);
      if (!lead.tag_ids?.some((id) => set.has(id))) return false;
    }
    if (filters.product_ids?.length) {
      const set = new Set(filters.product_ids);
      if (!interests.some((i) => set.has(i.product.id))) return false;
    }
    if (filters.source_types?.length && source && !filters.source_types.includes(source.type)) {
      return false;
    }
    if (typeof filters.score_min === "number" && lead.score < filters.score_min) return false;
    if (typeof filters.score_max === "number" && lead.score > filters.score_max) return false;
    if (filters.created_after && lead.created_at < filters.created_after) return false;
    if (filters.created_before && lead.created_at > filters.created_before) return false;
    if (typeof filters.is_suppressed === "boolean" && lead.is_suppressed !== filters.is_suppressed) {
      return false;
    }
    if (filters.has_email === true && !lead.email) return false;
    if (filters.has_email === false && lead.email) return false;
    if (filters.has_company === true && !company) return false;
    if (filters.has_company === false && company) return false;
    return true;
  });
}

export type SortKey = "score" | "created" | "updated" | "name" | "company" | "status";

export function sortRows(rows: LeadRow[], key: SortKey, dir: "asc" | "desc" = "desc"): LeadRow[] {
  const m = dir === "asc" ? 1 : -1;
  const get = (r: LeadRow): string | number => {
    switch (key) {
      case "score":
        return r.lead.score;
      case "created":
        return r.lead.created_at;
      case "updated":
        return r.lead.updated_at;
      case "name":
        return r.lead.name.toLowerCase();
      case "company":
        return r.company?.name.toLowerCase() ?? "~";
      case "status":
        return r.lead.status;
    }
  };
  return [...rows].sort((a, b) => {
    const av = get(a);
    const bv = get(b);
    if (av < bv) return -1 * m;
    if (av > bv) return 1 * m;
    return 0;
  });
}

function groupBy<T, K>(arr: T[], fn: (t: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const item of arr) {
    const k = fn(item);
    const existing = out.get(k);
    if (existing) existing.push(item);
    else out.set(k, [item]);
  }
  return out;
}

// re-export so consumers don't need to import from types as well as helpers.
export type { LeadFilters, LeadRow, Company, Source };
