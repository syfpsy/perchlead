// Safe CSV export. Suppressed / Do-Not-Contact leads are excluded by default;
// passing { includeSuppressed: true } is allowed but will trigger a warning
// in the UI.
//
// Presets shape exports for popular outreach destinations (Smartlead /
// Instantly / HubSpot). Pure functions; the UI just picks one and calls
// downloadCsv with the resulting columns.

"use client";

import type { LeadRow } from "@/types";
import { store } from "@/lib/store/data-store";
import { nid, nowIso } from "@/lib/utils/id";

export interface ExportOptions {
  includeSuppressed?: boolean;
  filename?: string;
}

export type ExportPresetKey = "generic" | "smartlead" | "instantly" | "hubspot";

interface ExportColumn {
  header: string;
  /** Cell value extractor. Returns null/undefined → empty string. */
  value: (row: LeadRow) => unknown;
}

interface ExportPreset {
  key: ExportPresetKey;
  label: string;
  description: string;
  columns: ExportColumn[];
  filenameSuffix: string;
}

function firstName(row: LeadRow) {
  const parts = row.lead.name.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
}
function lastName(row: LeadRow) {
  const parts = row.lead.name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

const GENERIC_COLUMNS: ExportColumn[] = [
  { header: "name", value: (r) => r.lead.name },
  { header: "email", value: (r) => r.lead.email },
  { header: "phone", value: (r) => r.lead.phone },
  { header: "title", value: (r) => r.lead.title },
  { header: "company", value: (r) => r.company?.name },
  { header: "domain", value: (r) => r.company?.domain },
  { header: "website", value: (r) => r.lead.website },
  { header: "linkedin_url", value: (r) => r.lead.linkedin_url },
  { header: "location", value: (r) => r.lead.location },
  { header: "status", value: (r) => r.lead.status },
  { header: "score", value: (r) => r.lead.score },
  { header: "tags", value: (r) => r.tags.map((t) => t.name).join(" | ") },
  {
    header: "product_interests",
    value: (r) =>
      r.interests.map((i) => `${i.product.name}:${i.interest.interest_level}`).join(" | "),
  },
  { header: "source", value: (r) => r.source?.name },
  { header: "is_suppressed", value: (r) => r.lead.is_suppressed },
  { header: "consent_basis", value: (r) => r.lead.consent_basis },
  { header: "created_at", value: (r) => r.lead.created_at },
];

// Smartlead expects per-row variables. They support arbitrary {{custom}} fields,
// but `email` is the only required column.
const SMARTLEAD_COLUMNS: ExportColumn[] = [
  { header: "email", value: (r) => r.lead.email },
  { header: "first_name", value: firstName },
  { header: "last_name", value: lastName },
  { header: "company_name", value: (r) => r.company?.name },
  { header: "title", value: (r) => r.lead.title },
  { header: "website", value: (r) => r.company?.website ?? r.lead.website },
  { header: "phone_number", value: (r) => r.lead.phone },
  { header: "linkedin_url", value: (r) => r.lead.linkedin_url },
  { header: "location", value: (r) => r.lead.location },
  {
    header: "perchlead_top_interest",
    value: (r) => r.interests[0]?.product.name ?? "",
  },
  {
    header: "perchlead_score",
    value: (r) => r.lead.score,
  },
];

// Instantly's CSV expects email + first/last/company/website. We add custom
// fields prefixed with `custom_` so it's clear where they came from.
const INSTANTLY_COLUMNS: ExportColumn[] = [
  { header: "email", value: (r) => r.lead.email },
  { header: "firstName", value: firstName },
  { header: "lastName", value: lastName },
  { header: "companyName", value: (r) => r.company?.name },
  { header: "website", value: (r) => r.company?.website ?? r.lead.website },
  { header: "phone", value: (r) => r.lead.phone },
  { header: "linkedinUrl", value: (r) => r.lead.linkedin_url },
  { header: "personalLinkedinUrl", value: (r) => r.lead.linkedin_url },
  { header: "title", value: (r) => r.lead.title },
  { header: "city", value: (r) => r.lead.location },
  { header: "custom_top_interest", value: (r) => r.interests[0]?.product.name ?? "" },
  { header: "custom_score", value: (r) => r.lead.score },
];

// HubSpot's contact import wants HubSpot-flavored property names. Lifecycle
// stages are mapped from our status enum.
const HUBSPOT_LIFECYCLE: Record<string, string> = {
  new: "lead",
  cleaned: "lead",
  enriched: "lead",
  qualified: "marketingqualifiedlead",
  contacted: "salesqualifiedlead",
  replied: "salesqualifiedlead",
  converted: "customer",
  rejected: "other",
  do_not_contact: "other",
};

const HUBSPOT_COLUMNS: ExportColumn[] = [
  { header: "Email", value: (r) => r.lead.email },
  { header: "First Name", value: firstName },
  { header: "Last Name", value: lastName },
  { header: "Phone Number", value: (r) => r.lead.phone },
  { header: "Job Title", value: (r) => r.lead.title },
  { header: "Company Name", value: (r) => r.company?.name },
  { header: "Website URL", value: (r) => r.company?.website ?? r.lead.website },
  { header: "LinkedIn Bio", value: (r) => r.lead.linkedin_url },
  { header: "City", value: (r) => r.lead.location },
  { header: "Lead Status", value: (r) => r.lead.status },
  { header: "Lifecycle Stage", value: (r) => HUBSPOT_LIFECYCLE[r.lead.status] ?? "lead" },
  {
    header: "Tags",
    value: (r) => r.tags.map((t) => t.name).join(";"),
  },
  {
    header: "Perchlead Score",
    value: (r) => r.lead.score,
  },
];

export const EXPORT_PRESETS: Record<ExportPresetKey, ExportPreset> = {
  generic: {
    key: "generic",
    label: "Generic CSV",
    description: "All fields, Perchlead-flavored. Good default.",
    columns: GENERIC_COLUMNS,
    filenameSuffix: "",
  },
  smartlead: {
    key: "smartlead",
    label: "Smartlead",
    description: "first_name / last_name / company_name + custom_ vars.",
    columns: SMARTLEAD_COLUMNS,
    filenameSuffix: "smartlead",
  },
  instantly: {
    key: "instantly",
    label: "Instantly",
    description: "Instantly's camelCase field set + custom_ vars.",
    columns: INSTANTLY_COLUMNS,
    filenameSuffix: "instantly",
  },
  hubspot: {
    key: "hubspot",
    label: "HubSpot Contacts",
    description: "Title-cased properties + auto-mapped Lifecycle Stage.",
    columns: HUBSPOT_COLUMNS,
    filenameSuffix: "hubspot",
  },
};

export const EXPORT_PRESET_LIST: Array<{ key: ExportPresetKey; label: string; description: string }> =
  (Object.values(EXPORT_PRESETS) as ExportPreset[]).map(({ key, label, description }) => ({
    key,
    label,
    description,
  }));

function escape(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsvWithColumns(
  rows: LeadRow[],
  columns: ExportColumn[],
  opts: ExportOptions = {},
): string {
  const filtered = opts.includeSuppressed
    ? rows
    : rows.filter((r) => !r.lead.is_suppressed && r.lead.status !== "do_not_contact");
  const lines: string[] = [columns.map((c) => c.header).join(",")];
  for (const r of filtered) {
    lines.push(columns.map((c) => escape(c.value(r))).join(","));
  }
  return lines.join("\n");
}

export function rowsToCsv(rows: LeadRow[], opts: ExportOptions = {}): string {
  return rowsToCsvWithColumns(rows, GENERIC_COLUMNS, opts);
}

export function downloadCsv(
  rows: LeadRow[],
  opts: ExportOptions & { preset?: ExportPresetKey } = {},
) {
  const preset = EXPORT_PRESETS[opts.preset ?? "generic"];
  const csv = rowsToCsvWithColumns(rows, preset.columns, opts);
  const today = new Date().toISOString().slice(0, 10);
  const filename =
    opts.filename ??
    `perchlead-${preset.filenameSuffix ? `${preset.filenameSuffix}-` : ""}export-${today}.csv`;
  triggerDownload(csv, filename, "text/csv;charset=utf-8");

  store.update((s) => {
    s.audit_logs.push({
      id: nid("aud"),
      owner_id: s.current_user.id,
      entity_type: "list",
      entity_id: filename,
      action: "export",
      metadata_json: {
        count: rows.length,
        included_suppressed: Boolean(opts.includeSuppressed),
        preset: preset.key,
      },
      created_at: nowIso(),
    });
  });
}

function triggerDownload(content: string, filename: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
