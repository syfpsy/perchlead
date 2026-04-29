"use client";

import { Select, SelectItem } from "@/lib/heroui-compat";
import type { ColumnMapping } from "@/types";

const FIELD_LABELS: Record<keyof ColumnMapping, { label: string; helper?: string }> = {
  email: { label: "Email", helper: "Used for dedupe and outreach." },
  name: { label: "Full name" },
  first_name: { label: "First name", helper: "Combined with last name if no full name column." },
  last_name: { label: "Last name" },
  company: { label: "Company" },
  website: { label: "Website / domain" },
  phone: { label: "Phone" },
  title: { label: "Title / role" },
  source: { label: "Source label", helper: "Where the lead came from." },
  linkedin_url: { label: "LinkedIn URL" },
  location: { label: "Location" },
  notes: { label: "Notes" },
};

const FIELD_ORDER: Array<keyof ColumnMapping> = [
  "name",
  "first_name",
  "last_name",
  "email",
  "company",
  "website",
  "title",
  "phone",
  "linkedin_url",
  "location",
  "source",
  "notes",
];

const NONE = "__none__";

export function ColumnMapper({
  headers,
  mapping,
  onChange,
}: {
  headers: string[];
  mapping: ColumnMapping;
  onChange: (next: ColumnMapping) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {FIELD_ORDER.map((field) => {
        const meta = FIELD_LABELS[field];
        const value = mapping[field] ?? NONE;
        return (
          <div key={field} className="rounded-2xl border border-soft bg-panel px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold text-ink-700">{meta.label}</p>
              {mapping[field] && (
                <span className="text-[10px] uppercase tracking-wider text-primary-600">
                  Mapped
                </span>
              )}
            </div>
            {meta.helper && <p className="text-[11px] text-ink-500">{meta.helper}</p>}
            <Select
              aria-label={`Map ${meta.label}`}
              size="sm"
              variant="bordered"
              selectedKeys={[value]}
              onSelectionChange={(keys) => {
                const k = Array.from(keys as Iterable<React.Key>)[0] as string;
                if (!k || k === NONE) {
                  const next = { ...mapping };
                  delete next[field];
                  onChange(next);
                } else {
                  onChange({ ...mapping, [field]: k });
                }
              }}
              classNames={{ trigger: "border-soft" }}
              items={[{ key: NONE, label: "— Not mapped —" }, ...headers.map((h) => ({ key: h, label: h }))]}
            >
              {(opt) => <SelectItem key={opt.key}>{opt.label}</SelectItem>}
            </Select>
          </div>
        );
      })}
    </div>
  );
}
