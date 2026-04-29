"use client";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Switch,
} from "@heroui/react";
import { ArrowRight, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import type { Company, Lead } from "@/types";
import {
  mockEnrichmentProvider,
  type EnrichmentResult,
} from "@/lib/providers/enrichment-provider";
import { addInteraction, updateLead } from "@/lib/services/lead-service";
import { store } from "@/lib/store/data-store";
import { nid, nowIso } from "@/lib/utils/id";
import { useToast } from "@/components/ui/toast";

type FieldKey =
  | "title"
  | "location"
  | "linkedin_url"
  | "company_industry"
  | "company_size"
  | "company_description"
  | "tech_stack";

interface FieldRow {
  key: FieldKey;
  label: string;
  current: string;
  proposed: string;
  scope: "lead" | "company";
}

export function EnrichmentModal({
  open,
  lead,
  company,
  onOpenChange,
}: {
  open: boolean;
  lead: Lead;
  company: Company | null;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const [accepted, setAccepted] = useState<Record<FieldKey, boolean>>({
    title: true,
    location: true,
    linkedin_url: true,
    company_industry: true,
    company_size: true,
    company_description: true,
    tech_stack: true,
  });

  // Reset on open and kick off the mock provider.
  useEffect(() => {
    if (!open) return;
    setResult(null);
    setLoading(true);
    let cancelled = false;
    mockEnrichmentProvider.enrich(lead, company).then((r) => {
      if (cancelled) return;
      setResult(r);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, lead, company]);

  const rows: FieldRow[] = useMemo(() => {
    if (!result) return [];
    const out: FieldRow[] = [];
    const f = result.fields;
    if (f.title) {
      out.push({ key: "title", label: "Title", current: lead.title ?? "", proposed: f.title, scope: "lead" });
    }
    if (f.location) {
      out.push({ key: "location", label: "Location", current: lead.location ?? "", proposed: f.location, scope: "lead" });
    }
    if (f.linkedin_url) {
      out.push({
        key: "linkedin_url",
        label: "LinkedIn",
        current: lead.linkedin_url ?? "",
        proposed: f.linkedin_url,
        scope: "lead",
      });
    }
    if (f.company_industry) {
      out.push({
        key: "company_industry",
        label: "Industry",
        current: company?.industry ?? "",
        proposed: f.company_industry,
        scope: "company",
      });
    }
    if (f.company_size) {
      out.push({
        key: "company_size",
        label: "Size",
        current: company?.size ?? "",
        proposed: f.company_size,
        scope: "company",
      });
    }
    if (f.company_description) {
      out.push({
        key: "company_description",
        label: "Description",
        current: company?.description ?? "",
        proposed: f.company_description,
        scope: "company",
      });
    }
    if (f.tech_stack?.length) {
      out.push({
        key: "tech_stack",
        label: "Tech stack",
        current: (company?.tech_stack ?? []).join(", "),
        proposed: f.tech_stack.join(", "),
        scope: "company",
      });
    }
    return out;
  }, [result, lead, company]);

  const acceptedCount = rows.filter((r) => accepted[r.key]).length;
  const noChangesNeeded = rows.every((r) => r.current === r.proposed);

  function apply() {
    if (!result || !rows.length) return;
    const leadPatch: Partial<Lead> = {};
    const companyPatch: Partial<Company> = {};
    let appliedCount = 0;

    for (const row of rows) {
      if (!accepted[row.key]) continue;
      if (row.current === row.proposed) continue;
      appliedCount++;
      if (row.scope === "lead") {
        if (row.key === "title") leadPatch.title = row.proposed;
        else if (row.key === "location") leadPatch.location = row.proposed;
        else if (row.key === "linkedin_url") leadPatch.linkedin_url = row.proposed;
      } else if (company) {
        if (row.key === "company_industry") companyPatch.industry = row.proposed;
        else if (row.key === "company_size") companyPatch.size = row.proposed;
        else if (row.key === "company_description") companyPatch.description = row.proposed;
        else if (row.key === "tech_stack") companyPatch.tech_stack = row.proposed.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    if (Object.keys(leadPatch).length) {
      updateLead(lead.id, leadPatch);
    }
    if (Object.keys(companyPatch).length && company) {
      store.update((s) => {
        const idx = s.companies.findIndex((c) => c.id === company.id);
        if (idx === -1) return;
        s.companies[idx] = { ...s.companies[idx]!, ...companyPatch, updated_at: nowIso() };
        s.audit_logs.push({
          id: nid("aud"),
          owner_id: s.current_user.id,
          entity_type: "company",
          entity_id: company.id,
          action: "update",
          metadata_json: companyPatch as Record<string, unknown>,
          created_at: nowIso(),
        });
      });
    }

    addInteraction({
      leadId: lead.id,
      type: "system",
      note: `Enriched via ${result.source} provider — ${appliedCount} field${appliedCount === 1 ? "" : "s"} updated.`,
    });

    if (lead.status === "new") {
      updateLead(lead.id, { status: "enriched" });
    }

    toast.push({
      tone: "success",
      title: `Enriched ${appliedCount} field${appliedCount === 1 ? "" : "s"}`,
      description: `From ${result.source} · cost ~$${result.cost_estimate_usd.toFixed(2)}.`,
    });
    onOpenChange(false);
  }

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange} size="2xl" placement="center" backdrop="blur">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-base font-semibold text-ink-900">Enrich {lead.name}</h3>
          </div>
          <p className="text-xs text-ink-500">
            Review every proposed change before it's applied. Today this runs the mock provider —
            swap in Hunter / Apollo / People Data Labs in{" "}
            <code className="rounded bg-ink-100 px-1 py-0.5 text-[10px]">
              lib/providers/enrichment-provider.ts
            </code>
            .
          </p>
        </ModalHeader>
        <ModalBody className="max-h-[60vh] overflow-y-auto scrollbar-thin">
          {loading ? (
            <ul className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <li
                  key={i}
                  className="h-12 animate-pulse rounded-xl border border-soft bg-ink-50/60"
                />
              ))}
            </ul>
          ) : rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-firm bg-white/50 dark:bg-ink-900/50 px-4 py-6 text-center text-sm text-ink-500">
              The provider didn't return anything new. Try wiring up a real provider.
            </p>
          ) : noChangesNeeded ? (
            <p className="rounded-xl border border-dashed border-firm bg-white/50 dark:bg-ink-900/50 px-4 py-6 text-center text-sm text-ink-500">
              All proposed fields already match what we have on file.
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => {
                const same = row.current === row.proposed;
                const isAccepted = accepted[row.key];
                return (
                  <li
                    key={row.key}
                    className={clsx(
                      "rounded-2xl border px-4 py-3 transition",
                      same
                        ? "border-soft bg-ink-50/60 opacity-70"
                        : isAccepted
                          ? "border-primary-200 bg-primary-50/40"
                          : "border-soft bg-panel",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                          {row.label}
                        </span>
                        <span
                          className={clsx(
                            "rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
                            row.scope === "lead"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-violet-50 text-violet-700",
                          )}
                        >
                          {row.scope}
                        </span>
                        {same && (
                          <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-500">
                            unchanged
                          </span>
                        )}
                      </div>
                      <Switch
                        size="sm"
                        isSelected={isAccepted && !same}
                        isDisabled={same}
                        onValueChange={(v) =>
                          setAccepted((cur) => ({ ...cur, [row.key]: v }))
                        }
                      />
                    </div>
                    <div className="mt-2 flex items-start gap-2 text-sm">
                      <div className="min-w-0 flex-1 rounded-xl bg-panel px-3 py-1.5 text-ink-600 ring-1 ring-soft">
                        <p className="text-[10px] uppercase tracking-wider text-ink-400">Current</p>
                        <p className="truncate">{row.current || <span className="text-ink-300">—</span>}</p>
                      </div>
                      <ArrowRight className="mt-4 h-3.5 w-3.5 shrink-0 text-ink-400" />
                      <div
                        className={clsx(
                          "min-w-0 flex-1 rounded-xl px-3 py-1.5 ring-1",
                          same
                            ? "bg-panel text-ink-500 ring-soft"
                            : "bg-primary-50 text-ink-900 ring-primary-200",
                        )}
                      >
                        <p className="text-[10px] uppercase tracking-wider text-primary-700">Proposed</p>
                        <p className="truncate">{row.proposed}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ModalBody>
        <ModalFooter className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-ink-500">
            {result
              ? `${(result.confidence * 100).toFixed(0)}% confidence · cost ~$${result.cost_estimate_usd.toFixed(2)}`
              : "Running provider…"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="light" onPress={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={apply}
              isDisabled={loading || rows.length === 0 || noChangesNeeded || acceptedCount === 0}
            >
              Apply {acceptedCount} change{acceptedCount === 1 ? "" : "s"}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
