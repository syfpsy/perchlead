// Tasks attached to leads. Lightweight by design — title, optional due date,
// open / done / snoozed. The lead profile uses these to drive "next action"
// follow-through.

"use client";

import type { ID, Task } from "@/types";
import { store } from "@/lib/store/data-store";
import { nid, nowIso } from "@/lib/utils/id";

export function createTask(args: {
  leadId: ID;
  title: string;
  due_date?: string | null;
}): Task {
  return store.update((s) => {
    const task: Task = {
      id: nid("task"),
      owner_id: s.current_user.id,
      lead_id: args.leadId,
      title: args.title.trim(),
      due_date: args.due_date ?? null,
      status: "open",
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    s.tasks.push(task);
    s.audit_logs.push({
      id: nid("aud"),
      owner_id: s.current_user.id,
      entity_type: "task",
      entity_id: task.id,
      action: "create",
      metadata_json: { lead_id: args.leadId, title: task.title },
      created_at: nowIso(),
    });
    return task;
  });
}

export function setTaskStatus(id: ID, status: Task["status"]): Task | null {
  return store.update((s) => {
    const idx = s.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    s.tasks[idx] = { ...s.tasks[idx]!, status, updated_at: nowIso() };
    s.audit_logs.push({
      id: nid("aud"),
      owner_id: s.current_user.id,
      entity_type: "task",
      entity_id: id,
      action: "update",
      metadata_json: { status },
      created_at: nowIso(),
    });
    return s.tasks[idx]!;
  });
}

export function deleteTask(id: ID): boolean {
  return store.update((s) => {
    const before = s.tasks.length;
    s.tasks = s.tasks.filter((t) => t.id !== id);
    return s.tasks.length < before;
  });
}

export function tasksForLead(allTasks: Task[], leadId: ID): Task[] {
  return allTasks
    .filter((t) => t.lead_id === leadId)
    .sort((a, b) => sortKey(a) - sortKey(b));
}

export function openTasks(allTasks: Task[]): Task[] {
  return allTasks.filter((t) => t.status === "open").sort((a, b) => sortKey(a) - sortKey(b));
}

function sortKey(t: Task): number {
  // Open first; then by due date ascending; then created descending.
  const statusWeight = t.status === "open" ? 0 : t.status === "snoozed" ? 1 : 2;
  const dueWeight = t.due_date ? new Date(t.due_date).getTime() : Infinity;
  return statusWeight * 1e15 + dueWeight;
}
