"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Input, Tab, Tabs } from "@heroui/react";
import {
  ArrowUpRight,
  Download,
  GitMerge,
  History,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Upload,
} from "lucide-react";
import clsx from "clsx";

import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useSnapshot } from "@/lib/store/use-snapshot";
import {
  buildActivityRows,
  filterActivity,
  type ActivityFilter,
  type ActivityRow,
} from "@/lib/services/activity-service";
import type { AuditLog } from "@/types";
import { formatRelative } from "@/lib/utils/format";

type TabKey = "all" | "leads" | "imports" | "exports" | "compliance";

const TABS: Array<{ key: TabKey; label: string; filter: ActivityFilter }> = [
  { key: "all", label: "All", filter: {} },
  { key: "leads", label: "Leads", filter: { entity_types: ["lead"] } },
  { key: "imports", label: "Imports", filter: { entity_types: ["import"] } },
  { key: "exports", label: "Exports", filter: { actions: ["export"] } },
  {
    key: "compliance",
    label: "Compliance",
    filter: { actions: ["suppress", "unsuppress", "delete"] },
  },
];

export default function ActivityPage() {
  const snapshot = useSnapshot();
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => buildActivityRows(snapshot), [snapshot]);

  const tabFilter = useMemo(
    () => TABS.find((t) => t.key === tab)?.filter ?? {},
    [tab],
  );

  const filtered = useMemo(
    () => filterActivity(rows, { ...tabFilter, query }),
    [rows, tabFilter, query],
  );

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Activity"
        description="Every status change, import, merge, suppress, export, and delete is logged here. The audit trail is your safety net for compliance reviews."
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-soft surface-panel p-2 shadow-soft md:flex-row md:items-center">
        <Input
          aria-label="Search activity"
          radius="lg"
          variant="bordered"
          startContent={<Search className="h-4 w-4 text-ink-400" />}
          placeholder="Search by name, action, or detail…"
          value={query}
          onValueChange={setQuery}
          classNames={{
            inputWrapper: "border-soft bg-white shadow-none data-[hover=true]:border-firm",
            input: "text-sm",
          }}
          className="flex-1"
        />
        <Tabs
          aria-label="Activity filter"
          size="sm"
          radius="full"
          variant="solid"
          selectedKey={tab}
          onSelectionChange={(k) => setTab(k as TabKey)}
          classNames={{
            tabList: "bg-ink-100/70 p-1",
            tab: "text-xs px-3",
            cursor: "shadow-soft",
          }}
        >
          {TABS.map((t) => (
            <Tab key={t.key} title={t.label} />
          ))}
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<History className="h-5 w-5" />}
          title="Nothing here yet"
          description={
            query
              ? "No activity matches that search."
              : "As you import, merge, suppress, or export, the trail shows up here."
          }
        />
      ) : (
        <ol className="space-y-5">
          {grouped.map(({ day, rows }) => (
            <li key={day} className="space-y-1.5">
              <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                {day}
              </h3>
              <ul className="overflow-hidden rounded-2xl border border-soft surface-panel shadow-soft">
                {rows.map((row) => (
                  <ActivityItem key={row.log.id} row={row} />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}

      <p className="text-[11px] text-ink-400">
        {rows.length} total event{rows.length === 1 ? "" : "s"} · Powered by{" "}
        <code className="rounded bg-ink-100 px-1 py-0.5 text-[10px]">audit_logs</code>.
      </p>
    </div>
  );
}

function ActivityItem({ row }: { row: ActivityRow }) {
  const Icon = iconFor(row.log.action);
  const tone = toneClasses(row.tone);
  const Wrapper = row.entityHref
    ? ({ children }: { children: React.ReactNode }) => (
        <Link
          href={row.entityHref!}
          className="group flex items-start gap-3 px-4 py-3 transition hover:bg-ink-50/60"
        >
          {children}
        </Link>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <div className="flex items-start gap-3 px-4 py-3">{children}</div>
      );

  return (
    <li className="border-b border-soft last:border-b-0">
      <Wrapper>
        <span className={clsx("mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg", tone)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm text-ink-800">
              <span className="font-semibold capitalize text-ink-900">{row.entityLabel}</span>
              <span className="text-ink-500"> — {row.verb}</span>
              <span className="ml-1 rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-600">
                {row.log.entity_type}
              </span>
            </p>
            <span className="shrink-0 text-[11px] text-ink-400">
              {formatRelative(row.log.created_at)}
            </span>
          </div>
          {row.detail && <p className="mt-0.5 text-xs text-ink-500">{row.detail}</p>}
        </div>
        {row.entityHref && (
          <ArrowUpRight className="invisible mt-1 h-4 w-4 shrink-0 text-ink-400 transition group-hover:visible" />
        )}
      </Wrapper>
    </li>
  );
}

function iconFor(action: AuditLog["action"]) {
  switch (action) {
    case "create":
      return Plus;
    case "update":
      return Pencil;
    case "delete":
      return Trash2;
    case "merge":
      return GitMerge;
    case "import":
      return Upload;
    case "export":
      return Download;
    case "suppress":
      return ShieldOff;
    case "unsuppress":
      return ShieldCheck;
    case "score":
      return RefreshCw;
  }
}

function toneClasses(tone: ActivityRow["tone"]): string {
  switch (tone) {
    case "primary":
      return "bg-primary-50 text-primary-700";
    case "success":
      return "bg-emerald-50 text-emerald-700";
    case "warning":
      return "bg-amber-50 text-amber-700";
    case "danger":
      return "bg-red-50 text-red-700";
    default:
      return "bg-ink-100 text-ink-600";
  }
}

function groupByDay(rows: ActivityRow[]) {
  const out: Array<{ day: string; rows: ActivityRow[] }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 86400000);

  for (const row of rows) {
    const d = new Date(row.log.created_at);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    let label: string;
    if (day.getTime() === today.getTime()) label = "Today";
    else if (day.getTime() === yesterday.getTime()) label = "Yesterday";
    else
      label = day.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: day.getFullYear() === today.getFullYear() ? undefined : "numeric",
      });
    const last = out[out.length - 1];
    if (last && last.day === label) last.rows.push(row);
    else out.push({ day: label, rows: [row] });
  }
  return out;
}
