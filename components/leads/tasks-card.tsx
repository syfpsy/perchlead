"use client";

import { Button, Input } from "@heroui/react";
import { Calendar, Check, Clock3, Trash2 } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";
import type { Task } from "@/types";
import { createTask, deleteTask, setTaskStatus } from "@/lib/services/task-service";
import { formatRelative } from "@/lib/utils/format";
import { LeadCard } from "./profile-cards";

export function TasksCard({ leadId, tasks }: { leadId: string; tasks: Task[] }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  function add() {
    if (!title.trim()) return;
    createTask({ leadId, title, due_date: due ? new Date(due).toISOString() : null });
    setTitle("");
    setDue("");
  }

  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <LeadCard
      title="Tasks"
      action={
        <span className="text-[11px] uppercase tracking-wider text-ink-400">
          {open.length} open
        </span>
      }
    >
      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={title}
            onValueChange={setTitle}
            placeholder="Follow up next Tuesday"
            radius="lg"
            size="sm"
            variant="bordered"
            className="flex-1"
            classNames={{
              inputWrapper: "border-soft bg-panel shadow-none",
              input: "text-sm",
            }}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Input
            value={due}
            onValueChange={setDue}
            type="date"
            radius="lg"
            size="sm"
            variant="bordered"
            className="sm:w-44"
            classNames={{
              inputWrapper: "border-soft bg-panel shadow-none",
              input: "text-sm",
            }}
            startContent={<Calendar className="h-3.5 w-3.5 text-ink-400" />}
          />
          <Button
            size="sm"
            color="primary"
            radius="lg"
            onPress={add}
            isDisabled={!title.trim()}
          >
            Add
          </Button>
        </div>

        {open.length === 0 && done.length === 0 && (
          <p className="rounded-xl border border-dashed border-firm bg-white/40 dark:bg-ink-900/20 px-3 py-3 text-center text-xs text-ink-500">
            No tasks yet. Add the next concrete step.
          </p>
        )}

        {open.length > 0 && (
          <ul className="space-y-1.5">
            {open.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        )}

        {done.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-[11px] uppercase tracking-wider text-ink-400 hover:text-ink-700">
              Done ({done.length})
            </summary>
            <ul className="mt-2 space-y-1.5">
              {done.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ul>
          </details>
        )}
      </div>
    </LeadCard>
  );
}

function TaskRow({ task }: { task: Task }) {
  const checked = task.status === "done";
  const overdue =
    task.status === "open" &&
    task.due_date != null &&
    new Date(task.due_date).getTime() < Date.now();
  return (
    <li
      className={clsx(
        "flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition",
        checked ? "border-soft bg-ink-50/50 text-ink-400" : "border-soft bg-panel",
      )}
    >
      <button
        type="button"
        onClick={() =>
          setTaskStatus(task.id, checked ? "open" : "done")
        }
        className={clsx(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
          checked
            ? "border-emerald-300 bg-emerald-50 text-emerald-600"
            : "border-firm bg-panel text-transparent hover:text-ink-300",
        )}
        aria-label={checked ? "Mark as open" : "Mark as done"}
      >
        <Check className="h-3 w-3" />
      </button>
      <div className="min-w-0 flex-1">
        <p className={clsx("truncate", checked && "line-through")}>{task.title}</p>
        {task.due_date && (
          <p
            className={clsx(
              "mt-0.5 inline-flex items-center gap-1 text-[11px]",
              overdue ? "text-red-600" : "text-ink-500",
            )}
          >
            <Clock3 className="h-3 w-3" />
            {formatRelative(task.due_date)}
            {overdue && " · overdue"}
          </p>
        )}
      </div>
      <button
        onClick={() => deleteTask(task.id)}
        aria-label="Delete task"
        className="rounded-full p-1 text-ink-400 transition hover:bg-ink-100 hover:text-red-600"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
