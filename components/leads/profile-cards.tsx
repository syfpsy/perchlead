"use client";

import { Button, Tooltip } from "@heroui/react";
import {
  AtSign,
  Building2,
  ExternalLink,
  Globe,
  Linkedin,
  MapPin,
  Phone,
  Shield,
  ShieldOff,
  Star,
  Tag as TagIcon,
} from "lucide-react";
import clsx from "clsx";
import type {
  Company,
  Interaction,
  Lead,
  LeadProductInterest,
  Product,
  ScoreResult,
  Source,
  Tag,
} from "@/types";
import { formatRelative } from "@/lib/utils/format";

export function LeadCard({ children, title, action }: { children: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-soft surface-panel shadow-soft">
      <header className="flex items-center justify-between border-b border-soft px-5 py-3">
        <h3 className="text-sm font-semibold tracking-tightish text-ink-800">{title}</h3>
        {action}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function ContactCard({ lead }: { lead: Lead }) {
  return (
    <LeadCard title="Contact">
      <ul className="space-y-2.5 text-sm">
        <Row icon={<AtSign className="h-4 w-4" />} label="Email">
          {lead.email ? (
            <a href={`mailto:${lead.email}`} className="text-primary-700 hover:underline">
              {lead.email}
            </a>
          ) : (
            <span className="text-ink-400">No email</span>
          )}
        </Row>
        <Row icon={<Phone className="h-4 w-4" />} label="Phone">
          {lead.phone ?? <span className="text-ink-400">—</span>}
        </Row>
        <Row icon={<Linkedin className="h-4 w-4" />} label="LinkedIn">
          {lead.linkedin_url ? (
            <a
              href={lead.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary-700 hover:underline"
            >
              View profile <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-ink-400">—</span>
          )}
        </Row>
        <Row icon={<MapPin className="h-4 w-4" />} label="Location">
          {lead.location ?? <span className="text-ink-400">—</span>}
        </Row>
      </ul>
    </LeadCard>
  );
}

export function CompanyCard({ company, lead }: { company: Company | null; lead: Lead }) {
  if (!company && !lead.website) {
    return (
      <LeadCard title="Company">
        <p className="text-sm text-ink-500">No company linked.</p>
      </LeadCard>
    );
  }
  return (
    <LeadCard title="Company">
      <div className="space-y-2.5 text-sm">
        <Row icon={<Building2 className="h-4 w-4" />} label="Name">
          {company?.name ?? <span className="text-ink-400">—</span>}
        </Row>
        <Row icon={<Globe className="h-4 w-4" />} label="Website">
          {(company?.website ?? lead.website) ? (
            <a
              href={company?.website ?? lead.website ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary-700 hover:underline"
            >
              {company?.domain ?? lead.website?.replace(/^https?:\/\//, "")}{" "}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-ink-400">—</span>
          )}
        </Row>
        {company?.industry && (
          <Row icon={<TagIcon className="h-4 w-4" />} label="Industry">
            {company.industry}
          </Row>
        )}
        {company?.location && (
          <Row icon={<MapPin className="h-4 w-4" />} label="Location">
            {company.location}
          </Row>
        )}
      </div>
    </LeadCard>
  );
}

export function ProductInterestCard({
  interests,
  products,
  onChangeLevel,
  onRemove,
  onAdd,
}: {
  interests: LeadProductInterest[];
  products: Product[];
  onChangeLevel: (productId: string, level: LeadProductInterest["interest_level"]) => void;
  onRemove: (productId: string) => void;
  onAdd: (productId: string) => void;
}) {
  const interestByProduct = new Map(interests.map((i) => [i.product_id, i]));
  return (
    <LeadCard title="Product interests">
      {products.length === 0 ? (
        <p className="text-sm text-ink-500">Add a product in Settings to start tagging interest.</p>
      ) : (
        <ul className="space-y-2">
          {products.map((p) => {
            const interest = interestByProduct.get(p.id);
            return (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-soft px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-800">{p.name}</p>
                  {interest?.reason && (
                    <p className="line-clamp-1 text-xs text-ink-500">{interest.reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {(["low", "medium", "high"] as const).map((level) => (
                    <Tooltip key={level} content={`${level} interest`}>
                      <button
                        type="button"
                        onClick={() => onChangeLevel(p.id, level)}
                        className={clsx(
                          "rounded-full px-2 py-1 text-[11px] font-medium ring-1 transition",
                          interest?.interest_level === level
                            ? level === "high"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : level === "medium"
                                ? "bg-amber-50 text-amber-700 ring-amber-200"
                                : "bg-ink-100 text-ink-700 ring-ink-200"
                            : "bg-white text-ink-500 ring-soft hover:bg-ink-50",
                        )}
                      >
                        {level}
                      </button>
                    </Tooltip>
                  ))}
                  {interest ? (
                    <Button
                      size="sm"
                      variant="light"
                      radius="full"
                      className="h-7 text-xs"
                      onPress={() => onRemove(p.id)}
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="flat"
                      radius="full"
                      className="h-7 bg-primary-50 text-xs text-primary-700"
                      startContent={<Star className="h-3 w-3" />}
                      onPress={() => onAdd(p.id)}
                    >
                      Add
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </LeadCard>
  );
}

export function ScoreCard({ result, score }: { result?: ScoreResult | null; score: number }) {
  if (!result) {
    return (
      <LeadCard title="Why this score?">
        <p className="text-sm text-ink-500">Score will be computed on next change.</p>
      </LeadCard>
    );
  }
  return (
    <LeadCard
      title="Why this score?"
      action={
        <span className="text-2xl font-semibold tabular-nums tracking-tightish text-ink-900">
          {score}
          <span className="text-sm font-normal text-ink-400"> / 100</span>
        </span>
      }
    >
      <ul className="space-y-2">
        {result.reasons.map((r, idx) => (
          <li
            key={idx}
            className="flex items-start justify-between gap-3 border-b border-soft pb-2 text-sm last:border-b-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="font-medium capitalize text-ink-800">{r.signal.replaceAll("_", " ")}</p>
              {r.detail && <p className="text-xs text-ink-500">{r.detail}</p>}
            </div>
            <span
              className={clsx(
                "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                r.delta > 0
                  ? "bg-emerald-50 text-emerald-700"
                  : r.delta < 0
                    ? "bg-red-50 text-red-700"
                    : "bg-ink-100 text-ink-600",
              )}
            >
              {r.delta > 0 ? "+" : ""}
              {r.delta}
            </span>
          </li>
        ))}
      </ul>
      {result.warnings.length > 0 && (
        <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <p className="font-medium">Heads up</p>
          <ul className="list-disc pl-4">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4 rounded-xl bg-primary-50/60 px-3 py-2 text-sm text-primary-800">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-700">
          Next action
        </p>
        <p className="font-medium">{result.next_action}</p>
      </div>
    </LeadCard>
  );
}

export function SummaryCard({
  lead,
  company,
  source,
  topInterest,
}: {
  lead: Lead;
  company: Company | null;
  source: Source | null;
  topInterest?: { product: Product; interest: LeadProductInterest } | null;
}) {
  const summary = buildSummary({ lead, company, source, topInterest });
  return (
    <LeadCard title="Summary">
      <p className="text-sm leading-relaxed text-ink-700">{summary}</p>
      <p className="mt-3 text-[11px] text-ink-400">
        Auto-generated from on-record data. AI-powered summaries can be plugged in via{" "}
        <code className="rounded bg-ink-100 px-1 py-0.5 text-[10px]">enrichment-provider.ts</code>.
      </p>
    </LeadCard>
  );
}

export function TagsCard({
  tags,
  allTags,
  onAdd,
  onRemove,
}: {
  tags: Tag[];
  allTags: Tag[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const tagSet = new Set(tags.map((t) => t.id));
  const remaining = allTags.filter((t) => !tagSet.has(t.id));
  return (
    <LeadCard title="Tags">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <button
            key={t.id}
            onClick={() => onRemove(t.id)}
            className="group inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2 py-1 text-xs text-ink-800"
            aria-label={`Remove tag ${t.name}`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
            {t.name}
            <span className="opacity-0 group-hover:opacity-100">×</span>
          </button>
        ))}
        {remaining.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer rounded-full border border-dashed border-firm px-2 py-1 text-xs text-ink-500 hover:bg-ink-100/70">
              + Add tag
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {remaining.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onAdd(t.id)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-xs text-ink-700 ring-1 ring-soft hover:bg-ink-50"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </button>
              ))}
            </div>
          </details>
        )}
        {allTags.length === 0 && (
          <p className="text-xs text-ink-400">No tags yet. Add some in Settings.</p>
        )}
      </div>
    </LeadCard>
  );
}

export function TimelineCard({
  interactions,
}: {
  interactions: Interaction[];
}) {
  if (!interactions.length) {
    return (
      <LeadCard title="Timeline">
        <p className="text-sm text-ink-500">No activity yet.</p>
      </LeadCard>
    );
  }
  const sorted = [...interactions].sort(
    (a, b) => new Date(b.happened_at).getTime() - new Date(a.happened_at).getTime(),
  );
  return (
    <LeadCard title="Timeline">
      <ol className="relative space-y-3 pl-5">
        <span className="absolute left-1.5 top-1 bottom-1 w-px bg-soft" aria-hidden />
        {sorted.map((i) => (
          <li key={i.id} className="relative">
            <span className="absolute -left-3.5 top-1 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-white" />
            <p className="text-sm font-medium text-ink-800 capitalize">{i.type}</p>
            {i.note && <p className="text-xs text-ink-600">{i.note}</p>}
            <p className="text-[11px] text-ink-400">{formatRelative(i.happened_at)}</p>
          </li>
        ))}
      </ol>
    </LeadCard>
  );
}

export function CompliancePanel({
  lead,
  source,
  onSuppressToggle,
}: {
  lead: Lead;
  source: Source | null;
  onSuppressToggle: () => void;
}) {
  return (
    <LeadCard title="Compliance">
      <ul className="space-y-2.5 text-sm">
        <Row icon={<Shield className="h-4 w-4" />} label="Source">
          {source?.name ?? <span className="text-ink-400">—</span>}
        </Row>
        <Row icon={<Shield className="h-4 w-4" />} label="Consent / basis">
          <span className="capitalize">
            {(lead.consent_basis ?? "unknown").replaceAll("_", " ")}
          </span>
        </Row>
        <Row icon={<ShieldOff className="h-4 w-4" />} label="Do Not Contact">
          {lead.is_suppressed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
              On — exports and outreach are blocked
            </span>
          ) : (
            <span className="text-ink-500">Off</span>
          )}
        </Row>
      </ul>
      <Button
        size="sm"
        radius="full"
        variant={lead.is_suppressed ? "flat" : "bordered"}
        className={clsx(
          "mt-3 text-xs",
          lead.is_suppressed
            ? "bg-emerald-50 text-emerald-700"
            : "border-soft bg-white text-red-700",
        )}
        startContent={<ShieldOff className="h-3 w-3" />}
        onPress={onSuppressToggle}
      >
        {lead.is_suppressed ? "Remove from suppression list" : "Mark Do Not Contact"}
      </Button>
    </LeadCard>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start justify-between gap-3">
      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-500">
        <span className="text-ink-400">{icon}</span>
        {label}
      </span>
      <span className="text-right text-sm text-ink-800">{children}</span>
    </li>
  );
}

function buildSummary(args: {
  lead: Lead;
  company: Company | null;
  source: Source | null;
  topInterest?: { product: Product; interest: LeadProductInterest } | null;
}): string {
  const { lead, company, source, topInterest } = args;
  const parts: string[] = [];
  parts.push(`${lead.name}${lead.title ? `, ${lead.title}` : ""}`);
  if (company) {
    parts.push(`at ${company.name}${company.location ? ` (${company.location})` : ""}`);
  } else if (lead.location) {
    parts.push(`based in ${lead.location}`);
  }
  if (topInterest) {
    parts.push(
      `Showed ${topInterest.interest.interest_level} interest in ${topInterest.product.name}` +
        (topInterest.interest.reason ? ` — ${topInterest.interest.reason}` : "."),
    );
  }
  if (source) {
    parts.push(`Came from ${source.name} (${source.type.replaceAll("_", " ")}).`);
  }
  if (lead.is_suppressed) {
    parts.push("⚠ On the suppression list — do not contact.");
  } else if (lead.score >= 75) {
    parts.push("Score is strong, prioritise this one.");
  } else if (lead.score < 30) {
    parts.push("Score is weak — consider enriching before any outreach.");
  }
  return parts.join(". ").replace(/\.\.+/g, ".");
}
