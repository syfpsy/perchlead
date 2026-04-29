"use client";

import Link from "next/link";
import clsx from "clsx";
import { Clock, ShieldOff } from "lucide-react";
import { motion } from "framer-motion";
import type { LeadRow } from "@/types";
import { statusLabel } from "@/components/ui/status-chip";
import { Avatar } from "@/components/ui/avatar";
import { ScoreBadge } from "@/components/ui/score-badge";
import { setLeadStatus } from "@/lib/services/lead-service";
import { leadStaleness } from "@/lib/services/staleness-service";
import { useToast } from "@/components/ui/toast";

// Pipeline columns shown in the board. "cleaned" and "enriched" funnel into
// "new"; "do_not_contact" funnels into "rejected" — keeps the board at 6 cols.
const PIPELINE = [
  "new",
  "qualified",
  "contacted",
  "replied",
  "converted",
  "rejected",
] as const;

type PipelineCol = (typeof PIPELINE)[number];

// Visual tone per column header.
const COL_TONE: Record<PipelineCol, string> = {
  new: "border-ink-200 bg-ink-50 text-ink-700",
  qualified: "border-emerald-200 bg-emerald-50 text-emerald-800",
  contacted: "border-blue-200 bg-blue-50 text-blue-800",
  replied: "border-violet-200 bg-violet-50 text-violet-800",
  converted: "border-green-200 bg-green-50 text-green-800",
  rejected: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

/** Map every lead status onto one of the six pipeline columns. */
function toColumn(status: string): PipelineCol {
  if (status === "cleaned" || status === "enriched") return "new";
  if (status === "do_not_contact") return "rejected";
  return (PIPELINE as readonly string[]).includes(status)
    ? (status as PipelineCol)
    : "new";
}

export function LeadBoard({ rows }: { rows: LeadRow[] }) {
  const toast = useToast();

  // Group rows into columns.
  const colMap = new Map<PipelineCol, LeadRow[]>(
    PIPELINE.map((s) => [s, []]),
  );
  for (const row of rows) {
    colMap.get(toColumn(row.lead.status))?.push(row);
  }

  function handleStatusDrop(
    leadId: string,
    targetStatus: PipelineCol,
  ) {
    setLeadStatus(leadId, targetStatus);
    toast.push({
      tone: "success",
      title: `Moved to ${statusLabel(targetStatus)}`,
    });
  }

  return (
    <div
      className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin"
      style={{ minHeight: 420 }}
    >
      {PIPELINE.map((status, colIdx) => (
        <BoardColumn
          key={status}
          status={status}
          rows={colMap.get(status) ?? []}
          colIdx={colIdx}
          onStatusChange={handleStatusDrop}
        />
      ))}
    </div>
  );
}

function BoardColumn({
  status,
  rows,
  colIdx,
  onStatusChange,
}: {
  status: PipelineCol;
  rows: LeadRow[];
  colIdx: number;
  onStatusChange: (leadId: string, status: PipelineCol) => void;
}) {
  // Allow dropping from a status-change context menu (see BoardCard).
  const tone = COL_TONE[status];

  return (
    <div className="flex w-[220px] shrink-0 flex-col gap-2">
      {/* Column header */}
      <div
        className={clsx(
          "flex items-center justify-between rounded-xl border px-3 py-1.5",
          tone,
        )}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          {statusLabel(status)}
        </span>
        <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">
          {rows.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-1.5">
        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-firm bg-white/40 px-3 py-5 text-center text-[11px] text-ink-400">
            Empty
          </div>
        )}
        {rows.map((row, idx) => (
          <motion.div
            key={row.lead.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.15,
              delay: Math.min(0.03 * (colIdx === 0 ? idx : idx * 0.5), 0.25),
            }}
          >
            <BoardCard
              row={row}
              pipeline={PIPELINE}
              onMoveTo={(s) => onStatusChange(row.lead.id, s)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function BoardCard({
  row,
  pipeline,
  onMoveTo,
}: {
  row: LeadRow;
  pipeline: readonly PipelineCol[];
  onMoveTo: (status: PipelineCol) => void;
}) {
  const { lead, company, tags, interests } = row;

  const topInterest = interests
    .slice()
    .sort((a, b) => weightLevel(b.interest.interest_level) - weightLevel(a.interest.interest_level))[0];

  return (
    <div className="group relative overflow-visible">
      <Link
        href={`/leads/${lead.id}`}
        className="flex flex-col gap-2 rounded-xl border border-soft surface-panel p-3 shadow-soft transition hover:border-firm hover:shadow-card"
      >
        {/* Name + score row */}
        <div className="flex items-start gap-2">
          <Avatar name={lead.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink-900 group-hover:text-primary-700">
              {lead.name}
            </p>
            {company ? (
              <p className="truncate text-[11px] text-ink-500">{company.name}</p>
            ) : lead.email ? (
              <p className="truncate text-[11px] text-ink-400">{lead.email}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {lead.is_suppressed && (
              <span title="Do Not Contact" aria-label="Do Not Contact">
                <ShieldOff className="h-3 w-3 text-red-400" />
              </span>
            )}
            <ScoreBadge score={lead.score} reason={lead.score_reason} size="sm" />
          </div>
        </div>

        {/* Staleness indicator */}
        {(() => {
          const stale = leadStaleness(row);
          if (!stale.isStale) return null;
          return (
            <p
              className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200"
              title={stale.reason ?? `${stale.daysSince}d since last activity`}
            >
              <Clock className="h-2.5 w-2.5" />
              {stale.daysSince}d idle
            </p>
          );
        })()}

        {/* Top product interest */}
        {topInterest && (
          <p className="truncate text-[11px] text-ink-500">
            <span
              className={clsx(
                "mr-1 font-medium",
                topInterest.interest.interest_level === "high"
                  ? "text-emerald-700"
                  : topInterest.interest.interest_level === "medium"
                    ? "text-amber-700"
                    : "text-ink-500",
              )}
            >
              {topInterest.interest.interest_level}
            </span>
            {topInterest.product.name}
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-600"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-400">
                +{tags.length - 2}
              </span>
            )}
          </div>
        )}
      </Link>

      {/* Quick-move chevrons — appear on hover, one per adjacent status */}
      <QuickMoveMenu
        currentStatus={toColumn(lead.status)}
        pipeline={pipeline}
        onMoveTo={onMoveTo}
      />
    </div>
  );
}

/**
 * A tiny inline context menu that pops up below the card on hover, letting
 * the user move the lead to any adjacent pipeline stage without navigating
 * away — a lightweight substitute for full DnD.
 */
function QuickMoveMenu({
  currentStatus,
  pipeline,
  onMoveTo,
}: {
  currentStatus: PipelineCol;
  pipeline: readonly PipelineCol[];
  onMoveTo: (status: PipelineCol) => void;
}) {
  const others = pipeline.filter((s) => s !== currentStatus);
  if (!others.length) return null;

  return (
    <div className="pointer-events-none absolute -bottom-1 left-0 right-0 z-10 flex translate-y-full flex-wrap justify-center gap-1 opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100 pb-1">
      {others.map((s) => (
        <button
          key={s}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMoveTo(s);
          }}
          className={clsx(
            "rounded-full border bg-panel px-2 py-0.5 text-[10px] font-medium shadow-pop transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
            COL_TONE[s],
          )}
        >
          → {statusLabel(s)}
        </button>
      ))}
    </div>
  );
}

function weightLevel(level: "low" | "medium" | "high") {
  return level === "high" ? 3 : level === "medium" ? 2 : 1;
}
