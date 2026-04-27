// CRUD + lifecycle operations on leads. Wraps the data store, applies
// scoring, and writes audit entries.

"use client";

import type {
  AuditLog,
  Company,
  ConsentBasis,
  ID,
  Interaction,
  Lead,
  LeadProductInterest,
  LeadStatus,
  Source,
  SourceType,
  Tag,
} from "@/types";
import { store } from "@/lib/store/data-store";
import { nid, nowIso } from "@/lib/utils/id";
import {
  extractDomain,
  isEmailish,
  normalizeCompanyName,
} from "@/lib/utils/string";
import { scoreLead } from "./scoring-service";
import { isSuppressed } from "./compliance-service";
import { mergeLeads as mergePure } from "./dedupe-service";

interface LeadDraft {
  name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  company_name?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  location?: string | null;
  status?: LeadStatus;
  notes?: string | null;
  consent_basis?: ConsentBasis | null;
  tag_ids?: ID[];
  product_interests?: Array<{
    product_id: ID;
    interest_level: LeadProductInterest["interest_level"];
    confidence?: number;
    reason?: string;
  }>;
  source?: { type: SourceType; name: string };
}

interface LeadServiceResult {
  lead: Lead;
  company: Company | null;
  source: Source | null;
}

export function createLead(draft: LeadDraft): LeadServiceResult {
  return store.update((s) => {
    const ownerId = s.current_user.id;
    const now = nowIso();

    const company = draft.company_name
      ? upsertCompany(s.companies, ownerId, draft.company_name, draft.website)
      : null;
    if (company && !s.companies.find((c) => c.id === company.id)) {
      s.companies.push(company);
    }

    const source: Source = {
      id: nid("src"),
      owner_id: ownerId,
      type: draft.source?.type ?? "manual",
      name: draft.source?.name ?? "Manual entry",
      imported_at: now,
      raw_payload_json: null,
      confidence: 0.95,
      created_at: now,
    };
    s.sources.push(source);

    const baseLead: Lead = {
      id: nid("lead"),
      owner_id: ownerId,
      name: draft.name.trim(),
      email: draft.email?.trim() || null,
      phone: draft.phone?.trim() || null,
      title: draft.title?.trim() || null,
      company_id: company?.id ?? null,
      website: draft.website?.trim() || company?.website || null,
      linkedin_url: draft.linkedin_url?.trim() || null,
      location: draft.location?.trim() || null,
      status: draft.status ?? "new",
      score: 0,
      score_reason: null,
      source_id: source.id,
      consent_basis: draft.consent_basis ?? null,
      is_suppressed: false,
      notes: draft.notes ?? null,
      tag_ids: draft.tag_ids ?? [],
      created_at: now,
      updated_at: now,
    };

    const sup = isSuppressed(baseLead, s.suppressions);
    if (sup.suppressed) {
      baseLead.is_suppressed = true;
      baseLead.status = "do_not_contact";
    }

    const interests: LeadProductInterest[] = (draft.product_interests ?? []).map((pi) => ({
      id: nid("int"),
      lead_id: baseLead.id,
      product_id: pi.product_id,
      interest_level: pi.interest_level,
      confidence: pi.confidence ?? 0.8,
      reason: pi.reason ?? null,
      source: source.name,
      created_at: now,
    }));
    s.product_interests.push(...interests);

    const score = scoreLead({
      lead: baseLead,
      company,
      source,
      interests,
    });
    baseLead.score = score.score;
    baseLead.score_reason = score;

    s.leads.push(baseLead);

    s.interactions.push(
      buildInteraction({
        ownerId,
        leadId: baseLead.id,
        type: "import",
        note: `Created via ${source.name} (${source.type}).`,
      }),
    );
    s.audit_logs.push(buildAudit({ ownerId, entity: "lead", id: baseLead.id, action: "create" }));

    return { lead: baseLead, company, source };
  });
}

export function updateLead(id: ID, patch: Partial<Lead>): Lead | null {
  return store.update((s) => {
    const idx = s.leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    const existing = s.leads[idx]!;
    const updated: Lead = { ...existing, ...patch, updated_at: nowIso() };
    s.leads[idx] = updated;
    s.audit_logs.push(
      buildAudit({
        ownerId: s.current_user.id,
        entity: "lead",
        id,
        action: "update",
        metadata: patch as Record<string, unknown>,
      }),
    );
    rescore(s, id);
    return s.leads[idx]!;
  });
}

export function setLeadStatus(id: ID, status: LeadStatus): Lead | null {
  return updateLead(id, { status });
}

export function suppressLead(id: ID, reason?: string): Lead | null {
  return store.update((s) => {
    const idx = s.leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    const existing = s.leads[idx]!;
    s.leads[idx] = {
      ...existing,
      is_suppressed: true,
      status: "do_not_contact",
      updated_at: nowIso(),
    };
    if (existing.email) {
      s.suppressions.push({
        id: nid("sup"),
        owner_id: s.current_user.id,
        email: existing.email.toLowerCase(),
        domain: extractDomain(existing.website ?? existing.email),
        reason: reason ?? "Marked Do Not Contact from lead profile",
        created_at: nowIso(),
      });
    }
    rescore(s, id);
    s.audit_logs.push(
      buildAudit({ ownerId: s.current_user.id, entity: "lead", id, action: "suppress", metadata: { reason } }),
    );
    return s.leads[idx]!;
  });
}

export function unsuppressLead(id: ID): Lead | null {
  return store.update((s) => {
    const idx = s.leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    const existing = s.leads[idx]!;
    s.leads[idx] = {
      ...existing,
      is_suppressed: false,
      status: "new",
      updated_at: nowIso(),
    };
    rescore(s, id);
    s.audit_logs.push(
      buildAudit({ ownerId: s.current_user.id, entity: "lead", id, action: "unsuppress" }),
    );
    return s.leads[idx]!;
  });
}

export function deleteLead(id: ID): boolean {
  return store.update((s) => {
    const before = s.leads.length;
    s.leads = s.leads.filter((l) => l.id !== id);
    s.product_interests = s.product_interests.filter((p) => p.lead_id !== id);
    s.interactions = s.interactions.filter((i) => i.lead_id !== id);
    s.tasks = s.tasks.filter((t) => t.lead_id !== id);
    s.audit_logs.push(
      buildAudit({ ownerId: s.current_user.id, entity: "lead", id, action: "delete" }),
    );
    return s.leads.length < before;
  });
}

export function addInteraction(args: {
  leadId: ID;
  type: Interaction["type"];
  note?: string;
}): Interaction {
  return store.update((s) => {
    const itx = buildInteraction({
      ownerId: s.current_user.id,
      leadId: args.leadId,
      type: args.type,
      note: args.note,
    });
    s.interactions.push(itx);
    rescore(s, args.leadId);
    return itx;
  });
}

export function addTagToLead(leadId: ID, tagId: ID): Lead | null {
  return store.update((s) => {
    const idx = s.leads.findIndex((l) => l.id === leadId);
    if (idx === -1) return null;
    const existing = s.leads[idx]!;
    if (existing.tag_ids.includes(tagId)) return existing;
    s.leads[idx] = { ...existing, tag_ids: [...existing.tag_ids, tagId], updated_at: nowIso() };
    return s.leads[idx]!;
  });
}

export function removeTagFromLead(leadId: ID, tagId: ID): Lead | null {
  return store.update((s) => {
    const idx = s.leads.findIndex((l) => l.id === leadId);
    if (idx === -1) return null;
    const existing = s.leads[idx]!;
    s.leads[idx] = {
      ...existing,
      tag_ids: existing.tag_ids.filter((t) => t !== tagId),
      updated_at: nowIso(),
    };
    return s.leads[idx]!;
  });
}

export function setLeadProductInterest(args: {
  leadId: ID;
  productId: ID;
  level: LeadProductInterest["interest_level"];
  reason?: string;
}): LeadProductInterest {
  return store.update((s) => {
    const existing = s.product_interests.find(
      (p) => p.lead_id === args.leadId && p.product_id === args.productId,
    );
    if (existing) {
      existing.interest_level = args.level;
      existing.reason = args.reason ?? existing.reason ?? null;
      rescore(s, args.leadId);
      return existing;
    }
    const created: LeadProductInterest = {
      id: nid("int"),
      lead_id: args.leadId,
      product_id: args.productId,
      interest_level: args.level,
      confidence: 0.8,
      reason: args.reason ?? null,
      source: "manual",
      created_at: nowIso(),
    };
    s.product_interests.push(created);
    rescore(s, args.leadId);
    return created;
  });
}

export function removeLeadProductInterest(leadId: ID, productId: ID) {
  store.update((s) => {
    s.product_interests = s.product_interests.filter(
      (p) => !(p.lead_id === leadId && p.product_id === productId),
    );
    rescore(s, leadId);
  });
}

export function mergeLeadsOp(winnerId: ID, loserId: ID): Lead | null {
  return store.update((s) => {
    const winnerIdx = s.leads.findIndex((l) => l.id === winnerId);
    const loserIdx = s.leads.findIndex((l) => l.id === loserId);
    if (winnerIdx === -1 || loserIdx === -1) return null;
    const winner = s.leads[winnerIdx]!;
    const loser = s.leads[loserIdx]!;
    s.leads[winnerIdx] = mergePure(winner, loser);
    s.leads.splice(loserIdx, 1);

    for (const itx of s.interactions) if (itx.lead_id === loserId) itx.lead_id = winnerId;
    for (const tk of s.tasks) if (tk.lead_id === loserId) tk.lead_id = winnerId;
    for (const pi of s.product_interests) if (pi.lead_id === loserId) pi.lead_id = winnerId;
    s.product_interests = dedupeProductInterests(s.product_interests);

    s.interactions.push(
      buildInteraction({
        ownerId: s.current_user.id,
        leadId: winnerId,
        type: "merge",
        note: `Merged duplicate lead "${loser.name}" into this one.`,
      }),
    );
    s.audit_logs.push(
      buildAudit({
        ownerId: s.current_user.id,
        entity: "lead",
        id: winnerId,
        action: "merge",
        metadata: { mergedFromId: loserId, mergedFromName: loser.name },
      }),
    );
    rescore(s, winnerId);
    // After splice, the winner's index may have shifted; look it up by id.
    return s.leads.find((l) => l.id === winnerId) ?? null;
  });
}

export function rescoreLead(id: ID): Lead | null {
  return store.update((s) => {
    const updated = rescore(s, id);
    return updated ?? null;
  });
}

// ---------- helpers ----------

function rescore(
  snapshot: ReturnType<typeof store.get>,
  leadId: ID,
): Lead | undefined {
  const idx = snapshot.leads.findIndex((l) => l.id === leadId);
  if (idx === -1) return undefined;
  const lead = snapshot.leads[idx]!;
  const company = lead.company_id ? snapshot.companies.find((c) => c.id === lead.company_id) ?? null : null;
  const source = lead.source_id ? snapshot.sources.find((src) => src.id === lead.source_id) ?? null : null;
  const interests = snapshot.product_interests.filter((p) => p.lead_id === leadId);
  const hasInteractions = snapshot.interactions.some((i) => i.lead_id === leadId && i.type !== "import");
  const result = scoreLead({ lead, company, source, interests, hasInteractions });
  snapshot.leads[idx] = {
    ...lead,
    score: result.score,
    score_reason: result,
    updated_at: nowIso(),
  };
  return snapshot.leads[idx]!;
}

function upsertCompany(
  companies: Company[],
  ownerId: ID,
  name: string,
  website?: string | null,
): Company {
  const norm = normalizeCompanyName(name);
  const domain = extractDomain(website);
  const existing = companies.find(
    (c) =>
      (norm && normalizeCompanyName(c.name) === norm) ||
      (domain && c.domain && c.domain === domain),
  );
  if (existing) return existing;
  const now = nowIso();
  return {
    id: nid("co"),
    owner_id: ownerId,
    name: name.trim(),
    domain: domain || null,
    website: website ?? null,
    industry: null,
    size: null,
    location: null,
    description: null,
    quality_score: null,
    tech_stack: null,
    social_links_json: null,
    created_at: now,
    updated_at: now,
  };
}

function buildInteraction(args: {
  ownerId: ID;
  leadId: ID;
  type: Interaction["type"];
  note?: string;
}): Interaction {
  const now = nowIso();
  return {
    id: nid("itx"),
    owner_id: args.ownerId,
    lead_id: args.leadId,
    type: args.type,
    note: args.note ?? null,
    happened_at: now,
    created_at: now,
  };
}

function buildAudit(args: {
  ownerId: ID;
  entity: AuditLog["entity_type"];
  id: ID;
  action: AuditLog["action"];
  metadata?: Record<string, unknown>;
}): AuditLog {
  return {
    id: nid("aud"),
    owner_id: args.ownerId,
    entity_type: args.entity,
    entity_id: args.id,
    action: args.action,
    metadata_json: args.metadata ?? null,
    created_at: nowIso(),
  };
}

function dedupeProductInterests(items: LeadProductInterest[]): LeadProductInterest[] {
  const seen = new Map<string, LeadProductInterest>();
  for (const item of items) {
    const key = `${item.lead_id}:${item.product_id}`;
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, item);
    } else {
      const weight = (l: LeadProductInterest["interest_level"]) =>
        l === "high" ? 3 : l === "medium" ? 2 : 1;
      seen.set(key, weight(item.interest_level) >= weight(prev.interest_level) ? item : prev);
    }
  }
  return Array.from(seen.values());
}

export function isValidEmail(email: string | null | undefined) {
  return isEmailish(email);
}

// Convenience for forms.
export function createTag(name: string, color = "#3a6bff"): Tag {
  return store.update((s) => {
    const existing = s.tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const tag: Tag = {
      id: nid("tag"),
      owner_id: s.current_user.id,
      name,
      color,
      created_at: nowIso(),
    };
    s.tags.push(tag);
    return tag;
  });
}
