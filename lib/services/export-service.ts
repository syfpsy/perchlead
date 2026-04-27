// Safe CSV export. Suppressed / Do-Not-Contact leads are excluded by default;
// passing { includeSuppressed: true } is allowed but will trigger a warning
// in the UI.

"use client";

import type { LeadRow } from "@/types";
import { store } from "@/lib/store/data-store";
import { nid, nowIso } from "@/lib/utils/id";

export interface ExportOptions {
  includeSuppressed?: boolean;
  filename?: string;
}

const HEADERS = [
  "name",
  "email",
  "phone",
  "title",
  "company",
  "domain",
  "website",
  "linkedin_url",
  "location",
  "status",
  "score",
  "tags",
  "product_interests",
  "source",
  "is_suppressed",
  "consent_basis",
  "created_at",
] as const;

function escape(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(rows: LeadRow[], opts: ExportOptions = {}): string {
  const filtered = opts.includeSuppressed
    ? rows
    : rows.filter((r) => !r.lead.is_suppressed && r.lead.status !== "do_not_contact");
  const lines: string[] = [HEADERS.join(",")];
  for (const r of filtered) {
    const tags = r.tags.map((t) => t.name).join(" | ");
    const interests = r.interests
      .map((i) => `${i.product.name}:${i.interest.interest_level}`)
      .join(" | ");
    lines.push(
      [
        r.lead.name,
        r.lead.email,
        r.lead.phone,
        r.lead.title,
        r.company?.name,
        r.company?.domain,
        r.lead.website,
        r.lead.linkedin_url,
        r.lead.location,
        r.lead.status,
        r.lead.score,
        tags,
        interests,
        r.source?.name,
        r.lead.is_suppressed,
        r.lead.consent_basis,
        r.lead.created_at,
      ]
        .map(escape)
        .join(","),
    );
  }
  return lines.join("\n");
}

export function downloadCsv(rows: LeadRow[], opts: ExportOptions = {}) {
  const csv = rowsToCsv(rows, opts);
  const filename = opts.filename ?? `perchlead-export-${new Date().toISOString().slice(0, 10)}.csv`;
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
