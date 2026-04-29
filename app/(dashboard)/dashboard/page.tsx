"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@heroui/react";
import { ArrowUpRight, Inbox, Sparkles, Upload } from "lucide-react";
import clsx from "clsx";

import { PageHeader } from "@/components/ui/page-header";
import { useSnapshot } from "@/lib/store/use-snapshot";
import { buildLeadRows } from "@/lib/services/search-service";
import { findStale } from "@/lib/services/staleness-service";
import { Avatar } from "@/components/ui/avatar";
import { ScoreBadge } from "@/components/ui/score-badge";
import { StatusChip } from "@/components/ui/status-chip";
import { formatRelative } from "@/lib/utils/format";
import type { LeadStatus } from "@/types";

export default function DashboardPage() {
  const snapshot = useSnapshot();
  const rows = useMemo(() => buildLeadRows(snapshot), [snapshot]);

  const total = rows.length;
  const newCount = rows.filter((r) => r.lead.status === "new").length;
  const qualified = rows.filter((r) => r.lead.status === "qualified").length;
  const followup = rows.filter(
    (r) => r.lead.status === "contacted" || r.lead.status === "replied",
  ).length;
  const suppressed = rows.filter((r) => r.lead.is_suppressed).length;

  // Pipeline funnel counts — ordered to show the journey.
  const FUNNEL_STAGES: Array<{ status: LeadStatus; label: string; color: string; bgBar: string }> = [
    { status: "new",        label: "New",        color: "text-ink-700",     bgBar: "bg-ink-300"       },
    { status: "qualified",  label: "Qualified",  color: "text-emerald-700", bgBar: "bg-emerald-400"   },
    { status: "contacted",  label: "Contacted",  color: "text-blue-700",    bgBar: "bg-blue-400"      },
    { status: "replied",    label: "Replied",    color: "text-violet-700",  bgBar: "bg-violet-400"    },
    { status: "converted",  label: "Converted",  color: "text-green-700",   bgBar: "bg-green-500"     },
    { status: "rejected",   label: "Rejected",   color: "text-zinc-600",    bgBar: "bg-zinc-300"      },
  ];
  const funnelCounts = FUNNEL_STAGES.map((s) => ({
    ...s,
    count: rows.filter((r) => r.lead.status === s.status).length,
  }));
  const funnelMax = Math.max(...funnelCounts.map((s) => s.count), 1);

  const sourceCounts = new Map<string, number>();
  for (const r of rows) {
    if (!r.source) continue;
    sourceCounts.set(r.source.name, (sourceCounts.get(r.source.name) ?? 0) + 1);
  }
  const topSources = Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const bestThisWeek = rows
    .filter((r) => new Date(r.lead.created_at).getTime() >= sevenDaysAgo)
    .sort((a, b) => b.lead.score - a.lead.score)
    .slice(0, 5);

  const recentImports = snapshot.imports
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 4);

  const openTasks = snapshot.tasks.filter((t) => t.status === "open");
  const overdueTasks = openTasks.filter(
    (t) => t.due_date && new Date(t.due_date).getTime() < Date.now(),
  );
  const staleRows = useMemo(() => findStale(rows), [rows]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Welcome back, ${snapshot.current_user.full_name.split(" ")[0]}`}
        description="A calm, fast read of where your leads stand right now."
        actions={
          <>
            <Button as={Link} href="/imports" variant="bordered" radius="lg" className="border-soft bg-white" startContent={<Upload className="h-4 w-4" />}>
              Import
            </Button>
            <Button as={Link} href="/leads?new=1" color="primary" radius="lg" startContent={<Sparkles className="h-4 w-4" />}>
              Add lead
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total leads" value={total} />
        <Stat label="New" value={newCount} tone="primary" />
        <Stat label="Qualified" value={qualified} tone="emerald" />
        <Stat label="Needs follow-up" value={followup} tone="amber" />
        <Stat
          label="Open tasks"
          value={openTasks.length}
          tone={overdueTasks.length > 0 ? "red" : "default"}
          hint={overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : undefined}
          href="/tasks"
        />
        <Stat
          label="Stale"
          value={staleRows.length}
          tone={staleRows.length > 0 ? "amber" : "default"}
          hint={staleRows.length > 0 ? "SLA breached" : undefined}
          href="/leads?view=stale"
        />
      </section>

      {/* Pipeline funnel */}
      {total > 0 && (
        <section className="rounded-2xl border border-soft surface-panel p-5 shadow-soft">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink-900">Pipeline</h3>
              <p className="text-xs text-ink-500">
                Conversion through each stage. Tap a row to filter the inbox.
              </p>
            </div>
            <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-medium text-ink-600 tabular-nums">
              {total} total
            </span>
          </header>
          <div className="space-y-2.5">
            {funnelCounts.map((stage, idx) => {
              const pctOfTotal = total > 0 ? Math.round((stage.count / total) * 100) : 0;
              const prev = funnelCounts[idx - 1];
              const convFromPrev = prev && prev.count > 0
                ? Math.round((stage.count / prev.count) * 100)
                : null;
              const barPct = funnelMax > 0 ? (stage.count / funnelMax) * 100 : 0;
              // Map stage to the inbox tab key that closest represents it.
              const inboxView =
                stage.status === "new" ? "new"
                : stage.status === "qualified" ? "qualified"
                : stage.status === "contacted" || stage.status === "replied" ? "needs_followup"
                : "all";
              return (
                <Link
                  key={stage.status}
                  href={`/leads?view=${inboxView}`}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-ink-50"
                >
                  <span className={clsx("w-20 shrink-0 text-xs font-medium", stage.color)}>
                    {stage.label}
                  </span>
                  <div className="flex-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                      <div
                        className={clsx("h-full rounded-full transition-all", stage.bgBar)}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-ink-800">
                    {stage.count}
                  </span>
                  <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-ink-400">
                    {pctOfTotal}%
                  </span>
                  {convFromPrev !== null && (
                    <span
                      className={clsx(
                        "w-20 shrink-0 text-right text-[11px] tabular-nums",
                        convFromPrev >= 50 ? "text-emerald-600" : convFromPrev >= 25 ? "text-amber-600" : "text-red-500",
                      )}
                    >
                      {convFromPrev}% from prev
                    </span>
                  )}
                  {convFromPrev === null && (
                    <span className="w-20 shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
          {suppressed > 0 && (
            <p className="mt-3 border-t border-soft pt-2 text-[11px] text-ink-400">
              {suppressed} lead{suppressed === 1 ? "" : "s"} suppressed (Do Not Contact) — excluded above.
            </p>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="space-y-3 rounded-2xl border border-soft surface-panel p-5 shadow-soft lg:col-span-2">
          <header className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink-900">Best leads this week</h3>
              <p className="text-xs text-ink-500">Imported in the last 7 days, sorted by score.</p>
            </div>
            <Button
              as={Link}
              href="/leads"
              size="sm"
              variant="light"
              radius="full"
              endContent={<ArrowUpRight className="h-3 w-3" />}
            >
              View all
            </Button>
          </header>
          {bestThisWeek.length === 0 ? (
            <p className="rounded-xl border border-dashed border-firm bg-white/50 px-3 py-6 text-center text-xs text-ink-500">
              No new leads this week. Try the Lead Finder or import a list.
            </p>
          ) : (
            <ul className="divide-y divide-soft">
              {bestThisWeek.map((row) => (
                <li key={row.lead.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link
                    href={`/leads/${row.lead.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 hover:bg-ink-50/60"
                  >
                    <Avatar name={row.lead.name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">{row.lead.name}</p>
                      <p className="truncate text-xs text-ink-500">
                        {row.company?.name ?? "—"} · {row.lead.email ?? "no email"}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <StatusChip status={row.lead.status} size="sm" />
                    <ScoreBadge score={row.lead.score} reason={row.lead.score_reason} size="sm" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-3 rounded-2xl border border-soft surface-panel p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-ink-900">Top sources</h3>
          {topSources.length === 0 ? (
            <p className="text-xs text-ink-500">No sources yet.</p>
          ) : (
            <ul className="space-y-2">
              {topSources.map(([name, count]) => (
                <li
                  key={name}
                  className="flex items-center justify-between rounded-xl border border-soft bg-white px-3 py-2 text-xs"
                >
                  <span className="truncate text-ink-700">{name}</span>
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-ink-600 tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-soft pt-4">
            <h3 className="text-sm font-semibold text-ink-900">Recent imports</h3>
            {recentImports.length === 0 ? (
              <p className="mt-1 text-xs text-ink-500">No imports yet.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {recentImports.map((imp) => (
                  <li key={imp.id} className="text-xs text-ink-600">
                    <p className="truncate font-medium text-ink-800">{imp.filename}</p>
                    <p className="text-[11px] text-ink-500">
                      +{imp.imported_count} · {formatRelative(imp.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <section className="rounded-2xl border border-dashed border-firm bg-white/50 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
            <Inbox className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900">Tip</p>
            <p className="mt-0.5 text-xs text-ink-600">
              Press <kbd className="rounded border border-firm bg-white px-1 text-[10px]">⌘K</kbd> for the command palette,{" "}
              <kbd className="rounded border border-firm bg-white px-1 text-[10px]">/</kbd> to focus search,{" "}
              <kbd className="rounded border border-firm bg-white px-1 text-[10px]">⌘N</kbd> to add a lead, and{" "}
              <kbd className="rounded border border-firm bg-white px-1 text-[10px]">⌘I</kbd> to jump to import.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
  hint,
  href,
}: {
  label: string;
  value: number;
  tone?: "default" | "primary" | "emerald" | "amber" | "red";
  hint?: string;
  href?: string;
}) {
  const palette = {
    default: "text-ink-900",
    primary: "text-primary-700",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
  } as const;
  const inner = (
    <>
      <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tightish ${palette[tone]}`}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-ink-500">{hint}</p>}
    </>
  );
  const className =
    "rounded-2xl border border-soft surface-panel px-4 py-3 shadow-soft" +
    (href ? " transition hover:border-primary-200 hover:shadow-card" : "");
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}
