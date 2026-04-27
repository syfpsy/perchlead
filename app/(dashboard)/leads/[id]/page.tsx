"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@heroui/react";
import { ArrowLeft, ChevronDown, Trash2 } from "lucide-react";

import { useSnapshot } from "@/lib/store/use-snapshot";
import {
  addInteraction,
  addTagToLead,
  deleteLead,
  mergeLeadsOp,
  removeLeadProductInterest,
  removeTagFromLead,
  setLeadProductInterest,
  setLeadStatus,
  suppressLead,
  unsuppressLead,
  updateLead,
} from "@/lib/services/lead-service";
import { findDuplicates } from "@/lib/services/dedupe-service";
import { useToast } from "@/components/ui/toast";

import { Avatar } from "@/components/ui/avatar";
import { ScoreBadge } from "@/components/ui/score-badge";
import { StatusChip, ALL_STATUSES, statusLabel } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CompanyCard,
  CompliancePanel,
  ContactCard,
  ProductInterestCard,
  ScoreCard,
  SummaryCard,
  TagsCard,
  TimelineCard,
} from "@/components/leads/profile-cards";
import { DuplicateWarning } from "@/components/leads/duplicate-warning";
import { NotesCard } from "@/components/leads/notes-card";
import { TasksCard } from "@/components/leads/tasks-card";
import type { LeadStatus } from "@/types";

export default function LeadProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const snapshot = useSnapshot();
  const toast = useToast();
  const [statusOpen, setStatusOpen] = useState(false);

  const lead = snapshot.leads.find((l) => l.id === params.id);
  const company = lead?.company_id
    ? snapshot.companies.find((c) => c.id === lead.company_id) ?? null
    : null;
  const source = lead?.source_id
    ? snapshot.sources.find((s) => s.id === lead.source_id) ?? null
    : null;
  const interests = lead
    ? snapshot.product_interests.filter((p) => p.lead_id === lead.id)
    : [];
  const interactions = lead
    ? snapshot.interactions.filter((i) => i.lead_id === lead.id)
    : [];
  const tasks = lead ? snapshot.tasks.filter((t) => t.lead_id === lead.id) : [];
  const tags = lead
    ? lead.tag_ids
        .map((id) => snapshot.tags.find((t) => t.id === id))
        .filter((t): t is (typeof snapshot.tags)[number] => Boolean(t))
    : [];

  const duplicates = useMemo(() => {
    if (!lead) return [];
    return findDuplicates(
      {
        email: lead.email,
        name: lead.name,
        website: lead.website,
        company_name: company?.name,
      },
      { leads: snapshot.leads.filter((l) => l.id !== lead.id), companies: snapshot.companies },
    );
  }, [lead, company, snapshot.leads, snapshot.companies]);

  if (!lead) {
    return (
      <EmptyState
        title="Lead not found"
        description="It may have been merged or deleted."
        action={
          <Button as={Link} href="/leads" radius="lg" startContent={<ArrowLeft className="h-4 w-4" />}>
            Back to inbox
          </Button>
        }
      />
    );
  }

  const topInterest = interests
    .slice()
    .sort((a, b) => weight(b.interest_level) - weight(a.interest_level))
    .map((i) => {
      const product = snapshot.products.find((p) => p.id === i.product_id);
      return product ? { product, interest: i } : null;
    })
    .filter(Boolean)[0] as
    | { product: (typeof snapshot.products)[number]; interest: (typeof interests)[number] }
    | undefined;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Inbox
        </Link>
      </div>

      <header className="flex flex-col gap-4 rounded-3xl border border-soft surface-panel p-5 shadow-soft md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={lead.name} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tightish text-ink-900 md:text-2xl">
                {lead.name}
              </h1>
              <ScoreBadge score={lead.score} reason={lead.score_reason} size="lg" />
            </div>
            <p className="text-sm text-ink-500">
              {lead.title ? `${lead.title} · ` : ""}
              {company?.name ?? "No company"} · {lead.email ?? "no email"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Button
              variant="bordered"
              radius="lg"
              className="border-soft bg-white"
              endContent={<ChevronDown className="h-4 w-4" />}
              onPress={() => setStatusOpen((v) => !v)}
            >
              <StatusChip status={lead.status} />
            </Button>
            {statusOpen && (
              <div className="absolute right-0 z-20 mt-1 w-56 rounded-2xl border border-soft surface-panel p-1 shadow-pop">
                {ALL_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setLeadStatus(lead.id, s);
                      setStatusOpen(false);
                      toast.push({
                        tone: "info",
                        title: `Status: ${statusLabel(s)}`,
                      });
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-sm hover:bg-ink-100"
                  >
                    <StatusChip status={s} size="sm" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            radius="lg"
            color="primary"
            variant="flat"
            onPress={() => {
              addInteraction({ leadId: lead.id, type: "note", note: "Touched by user." });
              toast.push({ tone: "success", title: "Activity logged" });
            }}
          >
            Log activity
          </Button>

          <Button
            radius="lg"
            variant="bordered"
            className="border-soft bg-white text-red-700"
            startContent={<Trash2 className="h-4 w-4" />}
            onPress={() => {
              if (window.confirm(`Delete ${lead.name}?`)) {
                deleteLead(lead.id);
                toast.push({ tone: "info", title: "Lead deleted" });
                router.push("/leads");
              }
            }}
          >
            Delete
          </Button>
        </div>
      </header>

      <DuplicateWarning
        duplicates={duplicates.slice(0, 3)}
        onMerge={(loserId) => {
          if (!window.confirm("Merge that record into this one?")) return;
          mergeLeadsOp(lead.id, loserId);
          toast.push({ tone: "success", title: "Merged" });
        }}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SummaryCard lead={lead} company={company} source={source} topInterest={topInterest} />
          <ScoreCard score={lead.score} result={lead.score_reason} />
          <TasksCard leadId={lead.id} tasks={tasks} />
          <TimelineCard interactions={interactions} />
          <NotesCard
            initial={lead.notes ?? null}
            onSave={(value) => {
              updateLead(lead.id, { notes: value });
              toast.push({ tone: "success", title: "Notes updated" });
            }}
          />
        </div>
        <div className="space-y-4">
          <ContactCard lead={lead} />
          <CompanyCard company={company} lead={lead} />
          <TagsCard
            tags={tags}
            allTags={snapshot.tags}
            onAdd={(id) => {
              addTagToLead(lead.id, id);
              toast.push({ tone: "info", title: "Tag added" });
            }}
            onRemove={(id) => {
              removeTagFromLead(lead.id, id);
              toast.push({ tone: "info", title: "Tag removed" });
            }}
          />
          <ProductInterestCard
            interests={interests}
            products={snapshot.products}
            onChangeLevel={(productId, level) => {
              setLeadProductInterest({ leadId: lead.id, productId, level });
              toast.push({ tone: "success", title: `Interest: ${level}` });
            }}
            onAdd={(productId) => {
              setLeadProductInterest({ leadId: lead.id, productId, level: "medium" });
              toast.push({ tone: "success", title: "Interest added" });
            }}
            onRemove={(productId) => {
              removeLeadProductInterest(lead.id, productId);
              toast.push({ tone: "info", title: "Interest removed" });
            }}
          />
          <CompliancePanel
            lead={lead}
            source={source}
            onSuppressToggle={() => {
              if (lead.is_suppressed) {
                unsuppressLead(lead.id);
                toast.push({ tone: "success", title: "Removed from suppression list" });
              } else {
                if (!window.confirm("Mark Do Not Contact? This will block exports for outreach."))
                  return;
                suppressLead(lead.id);
                toast.push({
                  tone: "info",
                  title: "Marked Do Not Contact",
                  description: "Score forced to 0; export will exclude this lead.",
                });
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

function weight(level: "low" | "medium" | "high") {
  return level === "high" ? 3 : level === "medium" ? 2 : 1;
}
