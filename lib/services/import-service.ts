// Import pipeline: parse CSV/paste -> map columns -> normalize -> dedupe ->
// commit. Each step is a pure function so the wizard UI can run them in
// preview mode before the user confirms.

"use client";

import Papa from "papaparse";
import type {
  ColumnMapping,
  Company,
  ConsentBasis,
  ID,
  ImportRecord,
  ImportRow,
  Lead,
  LeadProductInterest,
  Source,
  SourceType,
} from "@/types";
import { store } from "@/lib/store/data-store";
import { nid, nowIso } from "@/lib/utils/id";
import {
  extractDomain,
  isEmailish,
  normalizeCompanyName,
  titleCase,
} from "@/lib/utils/string";
import { findDuplicates, type DuplicateCandidate } from "./dedupe-service";
import { isSuppressed } from "./compliance-service";
import { scoreLead } from "./scoring-service";

export interface ParsedTable {
  headers: string[];
  rows: Array<Record<string, string>>;
}

const COLUMN_ALIASES: Record<keyof ColumnMapping, string[]> = {
  email: ["email", "mail", "e-mail", "contact email", "primary email", "work email"],
  name: ["name", "full name", "fullname", "contact", "person", "lead name"],
  first_name: ["first name", "firstname", "given name"],
  last_name: ["last name", "lastname", "surname", "family name"],
  company: ["company", "organization", "org", "business", "company name", "employer"],
  website: ["website", "url", "domain", "company url", "site", "web"],
  phone: ["phone", "tel", "mobile", "telephone", "phone number"],
  title: ["title", "role", "job title", "position"],
  source: ["source", "where_found", "origin", "channel"],
  linkedin_url: ["linkedin", "linkedin url", "profile", "linkedin profile"],
  location: ["location", "city", "country", "address"],
  notes: ["note", "notes", "comment", "comments", "description"],
};

export function parseCsvText(text: string): ParsedTable {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  return {
    headers: result.meta.fields ?? [],
    rows: (result.data ?? []).map(asStringRecord),
  };
}

export function parsePastedTable(text: string): ParsedTable {
  // Try TSV first (Excel / Google Sheets paste behavior), then CSV.
  const trimmed = text.replace(/\r/g, "");
  const firstLine = trimmed.split("\n")[0] ?? "";
  const delim = firstLine.includes("\t") ? "\t" : ",";
  const result = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    delimiter: delim,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  return {
    headers: result.meta.fields ?? [],
    rows: (result.data ?? []).map(asStringRecord),
  };
}

export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const norm = (s: string) => s.trim().toLowerCase();
  const headerNorms = headers.map(norm);
  for (const target of Object.keys(COLUMN_ALIASES) as Array<keyof ColumnMapping>) {
    const aliases = COLUMN_ALIASES[target];
    let matched: string | undefined;
    for (const alias of aliases) {
      const idx = headerNorms.indexOf(alias);
      if (idx !== -1) {
        matched = headers[idx];
        break;
      }
    }
    if (!matched) {
      // Fuzzy contains match.
      for (let i = 0; i < headerNorms.length; i++) {
        const h = headerNorms[i]!;
        if (aliases.some((a) => h === a || h.includes(a))) {
          matched = headers[i];
          break;
        }
      }
    }
    if (matched) mapping[target] = matched;
  }
  return mapping;
}

export interface NormalizedRow {
  raw: Record<string, string>;
  normalized: {
    name: string;
    email: string | null;
    phone: string | null;
    title: string | null;
    company_name: string | null;
    website: string | null;
    linkedin_url: string | null;
    location: string | null;
    notes: string | null;
  };
  errors: string[];
  duplicates: DuplicateCandidate[];
  willSuppress: boolean;
}

export function normalizeRow(
  row: Record<string, string>,
  mapping: ColumnMapping,
): NormalizedRow["normalized"] & { errors: string[] } {
  const get = (key: keyof ColumnMapping) => {
    const col = mapping[key];
    if (!col) return "";
    return (row[col] ?? "").trim();
  };
  const errors: string[] = [];

  const first = get("first_name");
  const last = get("last_name");
  let name = get("name");
  if (!name && (first || last)) name = [first, last].filter(Boolean).join(" ").trim();
  name = name ? titleCase(name) : "";

  let email = get("email").toLowerCase();
  if (email && !isEmailish(email)) errors.push(`Email "${email}" looks malformed.`);

  const company_name = get("company");
  let website = get("website");
  if (website && !/^https?:\/\//i.test(website) && /\./.test(website)) {
    website = `https://${website}`;
  }

  if (!name && !email) errors.push("Row has neither a name nor an email.");

  return {
    name: name || (email ? email.split("@")[0]! : "Unnamed lead"),
    email: email || null,
    phone: get("phone") || null,
    title: get("title") || null,
    company_name: company_name || null,
    website: website || null,
    linkedin_url: get("linkedin_url") || null,
    location: get("location") || null,
    notes: get("notes") || null,
    errors,
  };
}

export function previewImport(args: {
  rows: Array<Record<string, string>>;
  mapping: ColumnMapping;
}): NormalizedRow[] {
  const snapshot = store.get();
  return args.rows.map<NormalizedRow>((raw) => {
    const { errors, ...norm } = normalizeRow(raw, args.mapping);
    const dupes = findDuplicates(
      {
        email: norm.email,
        name: norm.name,
        website: norm.website,
        company_name: norm.company_name,
      },
      { leads: snapshot.leads, companies: snapshot.companies },
    );
    const willSuppress = isSuppressed(
      { email: norm.email, website: norm.website },
      snapshot.suppressions,
    ).suppressed;
    return { raw, normalized: norm, errors, duplicates: dupes, willSuppress };
  });
}

export interface CommitImportResult {
  importRecord: ImportRecord;
  imported: number;
  duplicates: number;
  errors: number;
}

export function commitImport(args: {
  filename: string;
  source_type: SourceType;
  source_name?: string;
  consent_basis?: ConsentBasis | null;
  mapping: ColumnMapping;
  preview: NormalizedRow[];
  /** When true, skip rows whose top duplicate has confidence >= threshold. */
  skipDuplicates?: boolean;
  duplicateThreshold?: number;
}): CommitImportResult {
  return store.update((s) => {
    const ownerId = s.current_user.id;
    const now = nowIso();
    const importId = nid("imp");
    const sourceId = nid("src");

    const source: Source = {
      id: sourceId,
      owner_id: ownerId,
      type: args.source_type,
      name: args.source_name ?? args.filename ?? "Imported file",
      imported_at: now,
      raw_payload_json: { filename: args.filename, mapping: args.mapping },
      confidence: 0.85,
      created_at: now,
    };
    s.sources.push(source);

    const importRecord: ImportRecord = {
      id: importId,
      owner_id: ownerId,
      filename: args.filename,
      source_type: args.source_type,
      status: "completed",
      total_rows: args.preview.length,
      imported_count: 0,
      duplicate_count: 0,
      error_count: 0,
      mapping_json: args.mapping,
      created_at: now,
    };
    s.imports.push(importRecord);

    const skipThreshold = args.duplicateThreshold ?? 0.9;

    for (const row of args.preview) {
      const importRow: ImportRow = {
        id: nid("irow"),
        import_id: importId,
        raw_json: row.raw,
        normalized_json: undefined,
        status: "pending",
        error: null,
        duplicate_of: null,
        created_at: now,
      };

      if (row.errors.length) {
        importRow.status = "error";
        importRow.error = row.errors.join(" ");
        importRecord.error_count++;
        s.import_rows.push(importRow);
        continue;
      }

      const topDupe = row.duplicates[0];
      if (args.skipDuplicates && topDupe && topDupe.confidence >= skipThreshold) {
        importRow.status = "duplicate";
        importRow.duplicate_of = topDupe.lead.id;
        importRecord.duplicate_count++;
        s.import_rows.push(importRow);
        continue;
      }

      const company = row.normalized.company_name
        ? upsertCompany(
            s.companies,
            ownerId,
            row.normalized.company_name,
            row.normalized.website,
          )
        : null;
      if (company && !s.companies.find((c) => c.id === company.id)) {
        s.companies.push(company);
      }

      const lead: Lead = {
        id: nid("lead"),
        owner_id: ownerId,
        name: row.normalized.name,
        email: row.normalized.email,
        phone: row.normalized.phone,
        title: row.normalized.title,
        company_id: company?.id ?? null,
        website: row.normalized.website ?? company?.website ?? null,
        linkedin_url: row.normalized.linkedin_url,
        location: row.normalized.location,
        status: "new",
        score: 0,
        score_reason: null,
        source_id: sourceId,
        consent_basis: args.consent_basis ?? null,
        is_suppressed: row.willSuppress,
        notes: row.normalized.notes,
        tag_ids: [],
        created_at: now,
        updated_at: now,
      };
      if (lead.is_suppressed) lead.status = "do_not_contact";

      const result = scoreLead({ lead, company, source });
      lead.score = result.score;
      lead.score_reason = result;

      s.leads.push(lead);
      importRow.status = "imported";
      importRow.normalized_json = {
        ...row.normalized,
        _company_name: row.normalized.company_name ?? undefined,
        _domain: extractDomain(row.normalized.website ?? row.normalized.email ?? "") || undefined,
      };
      importRecord.imported_count++;

      s.interactions.push({
        id: nid("itx"),
        owner_id: ownerId,
        lead_id: lead.id,
        type: "import",
        note: `Imported from ${source.name}`,
        happened_at: now,
        created_at: now,
      });
      s.audit_logs.push({
        id: nid("aud"),
        owner_id: ownerId,
        entity_type: "lead",
        entity_id: lead.id,
        action: "import",
        metadata_json: { import_id: importId, source_type: args.source_type },
        created_at: now,
      });
      s.import_rows.push(importRow);
    }

    s.audit_logs.push({
      id: nid("aud"),
      owner_id: ownerId,
      entity_type: "import",
      entity_id: importId,
      action: "import",
      metadata_json: {
        total: importRecord.total_rows,
        imported: importRecord.imported_count,
        duplicates: importRecord.duplicate_count,
        errors: importRecord.error_count,
      },
      created_at: nowIso(),
    });

    return {
      importRecord,
      imported: importRecord.imported_count,
      duplicates: importRecord.duplicate_count,
      errors: importRecord.error_count,
    };
  });
}

function asStringRecord(row: unknown): Record<string, string> {
  if (!row || typeof row !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    out[k] = v == null ? "" : String(v);
  }
  return out;
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

export interface SourceTypeGuess {
  type: SourceType;
  label: string;
  confidence: number; // 0..1
  signals: string[];
}

/**
 * Inspect parsed CSV/paste data to suggest the most likely SourceType.
 * Pure — keeps the wizard step decoupled from the catalog UI.
 */
export function inferSourceType(table: ParsedTable): SourceTypeGuess {
  const headers = table.headers.map((h) => h.toLowerCase());
  const sample = table.rows.slice(0, 8);
  const sampleBlob = sample
    .map((r) => Object.values(r).join(" ").toLowerCase())
    .join(" ");

  type Rule = {
    type: SourceType;
    label: string;
    headers?: string[]; // any of these in the headers
    blob?: string[]; // any of these in the sample values
    weight?: number;
  };

  const rules: Rule[] = [
    {
      type: "gumroad",
      label: "Gumroad export",
      headers: ["gumroad", "purchase_id", "sale_id", "product_permalink"],
      blob: ["gumroad.com"],
    },
    {
      type: "lemon_squeezy",
      label: "Lemon Squeezy export",
      headers: ["lemon_squeezy_id", "lemonsqueezy", "order_identifier"],
      blob: ["lemonsqueezy.com"],
    },
    {
      type: "paddle",
      label: "Paddle export",
      headers: ["paddle_order", "checkout_id", "subscription_id"],
      blob: ["paddle.com", "checkout.paddle.com"],
    },
    {
      type: "appsumo",
      label: "AppSumo Buyers",
      headers: ["appsumo", "deal", "redemption", "license_key"],
      blob: ["appsumo.com"],
    },
    {
      type: "hubspot",
      label: "HubSpot contacts",
      headers: ["hs_object_id", "hubspot_owner_id", "lifecyclestage", "lead_status"],
      blob: ["hubspot.com"],
    },
    {
      type: "smartlead",
      label: "Smartlead campaign",
      headers: ["campaign_id", "smartlead", "smartlead_lead_id"],
      blob: ["smartlead.ai"],
    },
    {
      type: "instantly",
      label: "Instantly campaign",
      headers: ["instantly", "campaign_status", "instantly_lead_id"],
      blob: ["instantly.ai"],
    },
    {
      type: "google_sheets",
      label: "Google Sheets export",
      blob: ["docs.google.com/spreadsheets"],
    },
  ];

  let best: SourceTypeGuess = {
    type: "csv",
    label: "Generic CSV",
    confidence: 0.3,
    signals: ["No fingerprints matched"],
  };

  for (const rule of rules) {
    const signals: string[] = [];
    let score = 0;
    for (const h of rule.headers ?? []) {
      if (headers.some((x) => x.includes(h))) {
        score += 0.5;
        signals.push(`header contains "${h}"`);
      }
    }
    for (const s of rule.blob ?? []) {
      if (sampleBlob.includes(s)) {
        score += 0.4;
        signals.push(`value contains "${s}"`);
      }
    }
    score = Math.min(1, score);
    if (score > best.confidence) {
      best = { type: rule.type, label: rule.label, confidence: score, signals };
    }
  }

  return best;
}

export const importableSources: Array<{ type: SourceType; label: string; helper: string }> = [
  { type: "csv", label: "CSV file", helper: "Upload a CSV exported from any tool." },
  { type: "paste", label: "Paste table", helper: "Paste rows from Excel or Google Sheets." },
  { type: "manual", label: "Manual entry", helper: "Add a single lead by hand." },
  { type: "webhook", label: "Webhook (preview)", helper: "Receive leads from forms or Zapier." },
  {
    type: "google_sheets",
    label: "Google Sheets (planned)",
    helper: "Sync from a sheet on a schedule.",
  },
  { type: "gumroad", label: "Gumroad (planned)", helper: "Buyers from a Gumroad export." },
  {
    type: "lemon_squeezy",
    label: "Lemon Squeezy (planned)",
    helper: "Buyers from Lemon Squeezy.",
  },
  { type: "paddle", label: "Paddle (planned)", helper: "Buyers from Paddle." },
  { type: "appsumo", label: "AppSumo (planned)", helper: "Customers from an AppSumo deal." },
  { type: "hubspot", label: "HubSpot (planned)", helper: "Sync contacts from HubSpot." },
];
