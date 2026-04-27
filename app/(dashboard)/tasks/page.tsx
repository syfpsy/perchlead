"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Tab, Tabs } from "@heroui/react";
import { Calendar, CheckCircle2, Clock3, Trash2 } from "lucide-react";
import clsx from "clsx";

import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { useSnapshot } from "@/lib/store/use-snapshot";
import { deleteTask, setTaskStatus } from "@/lib/services/task-service";
import { formatRelative } from "@/lib/utils/format";

type Filter = "open" | "overdue" | "due_soon" | "done" | "all";

export default function TasksPage() {
  const snapshot = useSnapshot();
  const [filter, setFilter] = useState<Filter>("open");

  const leadById = useMemo(
    () => new Map(snapshot.leads.map((l) => [l.id, l])),
    [snapshot.leads],
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    const soonCutoff = now + 1000 * 60 * 60 * 24 * 3; // 3 days
    return snapshot.tasks
      .filter((t) => {
        if (filter === "all") return true;
        if (filter === "done") return t.status === "done";
        if (t.status === "done") return false;
        if (filter === "overdue") {
          return t.due_date != null && new Date(t.due_date).getTime() < now;
        }
        if (filter === "due_soon") {
          return (
            t.due_date != null &&
            new Date(t.due_date).getTime() >= now &&
            new Date(t.due_date).getTime() <= soonCutoff
          );
        }
        return t.status === "open" || t.status === "snoozed";
      })
      .sort((a, b) => {
        const an = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const bn = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return an - bn;
      });
  }, [snapshot.tasks, filter]);

  const counts = useMemo(() => {
    const now = Date.now();
    const soonCutoff = now + 1000 * 60 * 60 * 24 * 3;
    return {
      open: snapshot.tasks.filter((t) => t.status === "open").length,
      overdue: snapshot.tasks.filter(
        (t) => t.status === "open" && t.due_date && new Date(t.due_date).getTime() < now,
      ).length,
      due_soon: snapshot.tasks.filter(
        (t) =>
          t.status === "open" &&
          t.due_date &&
          new Date(t.due_date).getTime() >= now &&
          new Date(t.due_date).getTime() <= soonCutoff,
      ).length,
      done: snapshot.tasks.filter((t) => t.status === "done").length,
      all: snapshot.tasks.length,
    };
  }, [snapshot.tasks]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tasks"
        description="Concrete next steps across every lead. Filter by status or urgency."
      />

      <Tabs
        aria-label="Task filter"
        size="sm"
        radius="full"
        variant="solid"
        selectedKey={filter}
        onSelectionChange={(k) => setFilter(k as Filter)}
        classNames={{
          tabList: "bg-ink-100/70 p-1",
          tab: "text-xs px-3",
          cursor: "shadow-soft",
        }}
      >
        <Tab key="open" title={`Open (${counts.open})`} />
        <Tab key="overdue" title={`Overdue (${counts.overdue})`} />
        <Tab key="due_soon" title={`Due ≤ 3d (${counts.due_soon})`} />
        <Tab key="done" title={`Done (${counts.done})`} />
        <Tab key="all" title={`All (${counts.all})`} />
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="No tasks here"
          description="Tasks live on the lead profile. Open a lead and add the next concrete step."
          action={
            <Button as={Link} href="/leads" radius="lg" color="primary">
              Browse leads
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((task) => {
            const lead = leadById.get(task.lead_id);
            const checked = task.status === "done";
            const overdue =
              task.status === "open" &&
              task.due_date != null &&
              new Date(task.due_date).getTime() < Date.now();
            return (
              <li
                key={task.id}
                className={clsx(
                  "flex items-center gap-3 rounded-2xl border border-soft surface-panel px-4 py-3 shadow-soft",
                  checked && "opacity-70",
                )}
              >
                <button
                  type="button"
                  onClick={() => setTaskStatus(task.id, checked ? "open" : "done")}
                  className={clsx(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                    checked
                      ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                      : "border-firm bg-white text-transparent hover:text-ink-300",
                  )}
                  aria-label={checked ? "Reopen" : "Mark done"}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>

                <div className="min-w-0 flex-1">
                  <p className={clsx("truncate text-sm font-medium text-ink-900", checked && "line-through")}>
                    {task.title}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-500">
                    {lead ? (
                      <Link
                        href={`/leads/${lead.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2 py-0.5 text-ink-700 hover:bg-ink-200"
                      >
                        <Avatar name={lead.name} size="sm" />
                        {lead.name}
                      </Link>
                    ) : (
                      <span className="text-ink-400">Lead deleted</span>
                    )}
                    {task.due_date && (
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1",
                          overdue ? "text-red-600" : "",
                        )}
                      >
                        <Clock3 className="h-3 w-3" />
                        {formatRelative(task.due_date)}
                        {overdue && " · overdue"}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      created {formatRelative(task.created_at)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => deleteTask(task.id)}
                  aria-label="Delete task"
                  className="rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
