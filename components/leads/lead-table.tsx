"use client";

import Link from "next/link";
import clsx from "clsx";
import { Tooltip } from "@heroui/react";
import { ArrowUpRight, Clock, ShieldOff, Star, Tag as TagIcon } from "lucide-react";
import type { LeadRow } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { ScoreBadge } from "@/components/ui/score-badge";
import { StatusChip } from "@/components/ui/status-chip";
import { formatRelative } from "@/lib/utils/format";
import { leadStaleness } from "@/lib/services/staleness-service";

export type Density = "comfortable" | "compact";

export function LeadTable({
  rows,
  selected,
  onSelect,
  onRowClick,
  density = "comfortable",
}: {
  rows: LeadRow[];
  selected: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  onRowClick?: (row: LeadRow) => void;
  density?: Density;
}) {
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.lead.id));
  const compact = density === "compact";

  return (
    <div className="overflow-hidden rounded-2xl border border-soft surface-panel shadow-soft">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full text-sm">
          <thead className="bg-ink-50/60 text-xs uppercase tracking-wider text-ink-500">
            <tr>
              <Th className="w-9">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-firm text-primary-600 focus:ring-primary-500"
                  aria-label="Select all"
                  checked={allSelected}
                  onChange={(e) => {
                    for (const r of rows) onSelect(r.lead.id, e.target.checked);
                  }}
                />
              </Th>
              <Th>Lead</Th>
              <Th>Company</Th>
              <Th>Source</Th>
              <Th>Product interest</Th>
              <Th>Status</Th>
              <Th className="text-right">Score</Th>
              <Th>Last activity</Th>
              <Th>Next action</Th>
              <Th className="w-8" />
            </tr>
          </thead>
          <tbody className={clsx(compact && "[&_td]:py-1.5")}>
            {rows.map((row) => {
              const lead = row.lead;
              const isSelected = selected.has(lead.id);
              return (
                <tr
                  key={lead.id}
                  className={clsx(
                    "group cursor-pointer border-t border-soft transition",
                    isSelected ? "bg-primary-50/50" : "hover:bg-ink-50/50",
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  <Td className="w-9" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${lead.name}`}
                      className="h-3.5 w-3.5 rounded border-firm text-primary-600 focus:ring-primary-500"
                      checked={isSelected}
                      onChange={(e) => onSelect(lead.id, e.target.checked)}
                    />
                  </Td>
                  <Td compact={compact}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={lead.name} size={compact ? "sm" : "md"} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-ink-900">
                            {lead.name}
                          </span>
                          {lead.is_suppressed && (
                            <Tooltip content="On suppression list" placement="top">
                              <ShieldOff className="h-3.5 w-3.5 text-red-500" />
                            </Tooltip>
                          )}
                        </div>
                        {!compact && (
                          <div className="truncate text-xs text-ink-500">
                            {lead.email ?? lead.phone ?? "—"}
                            {lead.title ? ` · ${lead.title}` : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink-800">
                        {row.company?.name ?? <span className="text-ink-400">No company</span>}
                      </div>
                      {row.company?.domain && (
                        <div className="truncate text-xs text-ink-500">{row.company.domain}</div>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1 rounded-full bg-ink-100/70 px-2 py-0.5 text-xs text-ink-700">
                      {row.source?.name ?? "—"}
                    </span>
                  </Td>
                  <Td>
                    {row.interests.length === 0 ? (
                      <span className="text-xs text-ink-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {row.interests.slice(0, 2).map(({ product, interest }) => (
                          <Tooltip
                            key={product.id}
                            content={interest.reason ?? `${interest.interest_level} interest`}
                          >
                            <span
                              className={clsx(
                                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] ring-1",
                                interest.interest_level === "high"
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                  : interest.interest_level === "medium"
                                    ? "bg-amber-50 text-amber-700 ring-amber-200"
                                    : "bg-ink-100 text-ink-700 ring-ink-200",
                              )}
                            >
                              <Star className="h-3 w-3" />
                              {product.name}
                            </span>
                          </Tooltip>
                        ))}
                        {row.interests.length > 2 && (
                          <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-600">
                            +{row.interests.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </Td>
                  <Td>
                    {(() => {
                      const stale = leadStaleness(row);
                      return (
                        <div className="flex flex-col items-start gap-0.5">
                          <StatusChip status={lead.status} />
                          {stale.isStale && (
                            <Tooltip
                              content={stale.reason ?? `${stale.daysSince}d since last activity`}
                              placement="top"
                            >
                              <span className="inline-flex cursor-default items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                                <Clock className="h-2.5 w-2.5" />
                                {stale.daysSince}d
                              </span>
                            </Tooltip>
                          )}
                        </div>
                      );
                    })()}
                  </Td>
                  <Td className="text-right">
                    <ScoreBadge score={lead.score} reason={lead.score_reason} />
                  </Td>
                  <Td>
                    <span className="text-xs text-ink-500">
                      {formatRelative(row.last_interaction_at ?? lead.updated_at)}
                    </span>
                  </Td>
                  <Td>
                    <span className="line-clamp-1 max-w-[220px] text-xs text-ink-600">
                      {row.next_action}
                    </span>
                  </Td>
                  <Td className="w-8 text-right" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/leads/${lead.id}`}
                      aria-label={`Open ${lead.name}`}
                      className="invisible inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-400 transition group-hover:visible hover:bg-ink-100 hover:text-ink-700"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-soft bg-ink-50/30 px-4 py-2 text-[11px] text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <TagIcon className="h-3 w-3" /> {rows.length} lead{rows.length === 1 ? "" : "s"}
        </span>
        <span>Click a row to open · cmd/ctrl + N to add · / to search</span>
      </div>
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={clsx(
        "px-3 py-2 text-left text-[11px] font-semibold text-ink-500",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
  onClick,
}: {
  children?: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  compact?: boolean; // ignored — density is applied at tbody level via arbitrary selectors
}) {
  return (
    <td onClick={onClick} className={clsx("px-3 py-3 align-middle", className)}>
      {children}
    </td>
  );
}
