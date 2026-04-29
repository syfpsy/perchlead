"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Popover, PopoverContent, PopoverTrigger, Textarea, Tooltip } from "@heroui/react";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Mail, Sparkles, Trash2 } from "lucide-react";

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
import { getNeighbors, readInboxCursor, type InboxCursor } from "@/lib/store/inbox-cursor";
import { activityForLead, buildActivityRows } from "@/lib/services/activity-service";

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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { NotesCard } from "@/components/leads/notes-card";
import { TasksCard } from "@/components/leads/tasks-card";
import { EnrichmentModal } from "@/components/leads/enrichment-modal";
import { EmailDraftModal } from "@/components/leads/email-draft-modal";
import type { LeadStatus } from "@/types";

export default function LeadProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const snapshot = useSnapshot();
  const toast = useToast();
  const [logNote, setLogNote] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmMergeId, setConfirmMergeId] = useState<string | null>(null);
  const [confirmSuppressOpen, setConfirmSuppressOpen] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [cursor, setCursor] = useState<InboxCursor | null>(null);

  useEffect(() => {
    setCursor(readInboxCursor());
  }, [params.id]);

  const neighbors = useMemo(
    () => getNeighbors(cursor, params.id ?? ""),
    [cursor, params.id],
  );

  // j/k between filtered leads, e to focus notes (handled in NotesCard via id),
  // t to add a task, ⌘← / ⌘→ to navigate.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const editing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (editing) return;
      if (e.key === "j" || (e.key === "ArrowRight" && (e.metaKey || e.ctrlKey))) {
        if (neighbors.next) {
          e.preventDefault();
          router.push(`/leads/${neighbors.next}`);
        }
      } else if (e.key === "k" || (e.key === "ArrowLeft" && (e.metaKey || e.ctrlKey))) {
        if (neighbors.prev) {
          e.preventDefault();
          router.push(`/leads/${neighbors.prev}`);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        router.push("/leads");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [neighbors, router]);

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
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Inbox
        </Link>
        {cursor && typeof neighbors.index === "number" && (
          <div className="flex items-center gap-1 text-xs text-ink-500">
            <Tooltip content={neighbors.prev ? "Previous (k)" : "No previous lead"} placement="top">
              <Button
                isIconOnly
                size="sm"
                radius="full"
                variant="bordered"
                className="h-7 w-7 min-w-7 border-soft bg-panel"
                isDisabled={!neighbors.prev}
                onPress={() => neighbors.prev && router.push(`/leads/${neighbors.prev}`)}
                aria-label="Previous lead"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </Tooltip>
            <span className="px-2 tabular-nums">
              <span className="font-medium text-ink-800">{(neighbors.index ?? 0) + 1}</span>
              <span className="text-ink-400"> / {neighbors.total}</span>
              {cursor.label && <span className="ml-1.5 text-ink-400">in {cursor.label}</span>}
            </span>
            <Tooltip content={neighbors.next ? "Next (j)" : "No next lead"} placement="top">
              <Button
                isIconOnly
                size="sm"
                radius="full"
                variant="bordered"
                className="h-7 w-7 min-w-7 border-soft bg-panel"
                isDisabled={!neighbors.next}
                onPress={() => neighbors.next && router.push(`/leads/${neighbors.next}`)}
                aria-label="Next lead"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Tooltip>
          </div>
        )}
      </div>

      <header className="flex flex-col gap-4 rounded-3xl border border-soft surface-panel p-5 shadow-soft md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={lead.name} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-normal tracking-tight text-ink-900 md:text-2xl">
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
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                variant="bordered"
                radius="lg"
                className="border-soft bg-panel"
                endContent={<ChevronDown className="h-4 w-4" />}
              >
                <StatusChip status={lead.status} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Change lead status"
              selectionMode="none"
              onAction={(key) => {
                setLeadStatus(lead.id, key as LeadStatus);
                toast.push({ tone: "info", title: `Status: ${statusLabel(key as LeadStatus)}` });
              }}
              classNames={{ base: "min-w-[200px]" }}
            >
              {ALL_STATUSES.map((s) => (
                <DropdownItem key={s} textValue={statusLabel(s)}>
                  <StatusChip status={s} size="sm" />
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>

          <Tooltip content="Run enrichment provider (mock today)" placement="top">
            <Button
              radius="lg"
              color="primary"
              variant="flat"
              startContent={<Sparkles className="h-4 w-4" />}
              onPress={() => setEnrichOpen(true)}
            >
              Enrich
            </Button>
          </Tooltip>
          <Tooltip
            content={lead.email ? "Draft an email — opens your mail client" : "No email on file"}
            placement="top"
          >
            <Button
              radius="lg"
              color="primary"
              startContent={<Mail className="h-4 w-4" />}
              onPress={() => setDraftOpen(true)}
              isDisabled={!lead.email}
            >
              Draft email
            </Button>
          </Tooltip>
          <Popover placement="bottom">
            <PopoverTrigger>
              <Button
                radius="lg"
                variant="bordered"
                className="border-soft bg-panel"
              >
                Log activity
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 rounded-2xl">
              <p className="mb-2 text-xs font-medium text-ink-700">Add a note</p>
              <Textarea
                value={logNote}
                onValueChange={setLogNote}
                placeholder="What happened with this lead?"
                minRows={2}
                maxRows={4}
                variant="bordered"
                classNames={{
                  inputWrapper: "border-soft bg-panel shadow-none",
                  input: "text-sm",
                }}
              />
              <Button
                size="sm"
                color="primary"
                radius="lg"
                className="mt-2 w-full"
                isDisabled={!logNote.trim()}
                onPress={() => {
                  addInteraction({ leadId: lead.id, type: "note", note: logNote.trim() });
                  toast.push({ tone: "success", title: "Activity logged" });
                  setLogNote("");
                }}
              >
                Log note
              </Button>
            </PopoverContent>
          </Popover>

          <Button
            radius="lg"
            variant="bordered"
            className="border-soft bg-panel text-red-700"
            startContent={<Trash2 className="h-4 w-4" />}
            onPress={() => setConfirmDeleteOpen(true)}
          >
            Delete
          </Button>
        </div>
      </header>

      <DuplicateWarning
        duplicates={duplicates.slice(0, 3)}
        onMerge={(loserId) => setConfirmMergeId(loserId)}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SummaryCard lead={lead} company={company} source={source} topInterest={topInterest} />
          <ScoreCard score={lead.score} result={lead.score_reason} />
          <TasksCard leadId={lead.id} tasks={tasks} />
          <TimelineCard interactions={interactions} />
          <LeadActivityCard leadId={lead.id} />
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
                setConfirmSuppressOpen(true);
              }
            }}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={`Delete ${lead.name}?`}
        description="This cannot be undone. All interactions, tasks, and product interests will be removed."
        confirmLabel="Delete lead"
        isDangerous
        onConfirm={() => {
          setConfirmDeleteOpen(false);
          deleteLead(lead.id);
          toast.push({ tone: "info", title: "Lead deleted" });
          router.push("/leads");
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
      <ConfirmDialog
        open={confirmMergeId !== null}
        title="Merge into this lead?"
        description="The other record's interactions and data will be absorbed. This cannot be undone."
        confirmLabel="Merge"
        onConfirm={() => {
          if (confirmMergeId) {
            mergeLeadsOp(lead.id, confirmMergeId);
            toast.push({ tone: "success", title: "Merged" });
          }
          setConfirmMergeId(null);
        }}
        onCancel={() => setConfirmMergeId(null)}
      />
      <ConfirmDialog
        open={confirmSuppressOpen}
        title="Mark as Do Not Contact?"
        description="This will set score to 0 and block this lead from all exports and outreach."
        confirmLabel="Mark Do Not Contact"
        isDangerous
        onConfirm={() => {
          setConfirmSuppressOpen(false);
          suppressLead(lead.id);
          toast.push({
            tone: "info",
            title: "Marked Do Not Contact",
            description: "Score forced to 0; export will exclude this lead.",
          });
        }}
        onCancel={() => setConfirmSuppressOpen(false)}
      />
      <EnrichmentModal
        open={enrichOpen}
        lead={lead}
        company={company}
        onOpenChange={setEnrichOpen}
      />
      <EmailDraftModal
        open={draftOpen}
        lead={lead}
        company={company}
        topInterest={topInterest}
        onOpenChange={setDraftOpen}
      />
    </div>
  );
}

function weight(level: "low" | "medium" | "high") {
  return level === "high" ? 3 : level === "medium" ? 2 : 1;
}

function LeadActivityCard({ leadId }: { leadId: string }) {
  const snapshot = useSnapshot();
  const rows = useMemo(() => activityForLead(buildActivityRows(snapshot), leadId), [snapshot, leadId]);
  if (!rows.length) return null;
  return (
    <section className="rounded-2xl border border-soft surface-panel shadow-soft">
      <header className="flex items-center justify-between border-b border-soft px-5 py-3">
        <h3 className="text-sm font-semibold tracking-tightish text-ink-800">Audit trail</h3>
        <Link
          href={`/activity?lead=${leadId}`}
          className="rounded-full px-2 py-0.5 text-[11px] font-medium text-primary-700 hover:bg-primary-50"
        >
          Open in Activity →
        </Link>
      </header>
      <ul className="divide-y divide-soft px-5">
        {rows.slice(0, 8).map((row) => (
          <li key={row.log.id} className="flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs text-ink-700">
                <span className="capitalize">{row.verb}</span>
                <span className="ml-1 rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-500">
                  {row.log.entity_type}
                </span>
              </p>
              {row.detail && <p className="mt-0.5 text-[11px] text-ink-500">{row.detail}</p>}
            </div>
            <span className="shrink-0 text-[11px] text-ink-400">
              {new Date(row.log.created_at).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </li>
        ))}
      </ul>
      {rows.length > 8 && (
        <p className="border-t border-soft px-5 py-2 text-[11px] text-ink-400">
          {rows.length - 8} earlier event{rows.length - 8 === 1 ? "" : "s"} · view all in{" "}
          <Link href={`/activity?lead=${leadId}`} className="text-primary-700 hover:underline">
            Activity
          </Link>
          .
        </p>
      )}
    </section>
  );
}
