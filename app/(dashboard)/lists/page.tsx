"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@heroui/react";
import { Layers3, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useSnapshot } from "@/lib/store/use-snapshot";
import { applyFilters, buildLeadRows } from "@/lib/services/search-service";
import { store } from "@/lib/store/data-store";
import { nid, nowIso } from "@/lib/utils/id";
import { useToast } from "@/components/ui/toast";

export default function ListsPage() {
  const snapshot = useSnapshot();
  const toast = useToast();
  const rows = useMemo(() => buildLeadRows(snapshot), [snapshot]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  function createList() {
    if (!name.trim()) return;
    store.update((s) => {
      s.lists.push({
        id: nid("list"),
        owner_id: s.current_user.id,
        name: name.trim(),
        filters_json: {},
        created_at: nowIso(),
        updated_at: nowIso(),
      });
    });
    toast.push({ tone: "success", title: "List created" });
    setName("");
    setCreating(false);
  }

  function deleteList(id: string) {
    if (!window.confirm("Delete this list?")) return;
    store.update((s) => {
      s.lists = s.lists.filter((l) => l.id !== id);
    });
    toast.push({ tone: "info", title: "List deleted" });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lists & saved views"
        description="Stash filters as reusable views. Use these to focus on a slice — high-priority, motion studios, needs-email, your AppSumo cohort."
        actions={
          <Button color="primary" radius="lg" startContent={<Plus className="h-4 w-4" />} onPress={() => setCreating(true)}>
            New list
          </Button>
        }
      />

      {creating && (
        <div className="flex items-center gap-2 rounded-2xl border border-soft surface-panel p-3 shadow-soft">
          <Input
            autoFocus
            value={name}
            onValueChange={setName}
            placeholder="e.g. Buyers in Berlin"
            radius="lg"
            classNames={{
              inputWrapper: "border-soft bg-white shadow-none",
              input: "text-sm",
            }}
            variant="bordered"
            onKeyDown={(e) => e.key === "Enter" && createList()}
          />
          <Button color="primary" size="sm" onPress={createList} isDisabled={!name.trim()}>
            Save
          </Button>
          <Button size="sm" variant="light" onPress={() => setCreating(false)}>
            Cancel
          </Button>
        </div>
      )}

      {snapshot.lists.length === 0 && !creating ? (
        <EmptyState
          icon={<Layers3 className="h-5 w-5" />}
          title="No saved views yet"
          description="Filter the inbox the way you'd like, then save it here as a list."
          action={
            <Button color="primary" radius="lg" onPress={() => setCreating(true)}>
              Create your first list
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {snapshot.lists.map((list) => {
            const matched = applyFilters(rows, list.filters_json);
            const top = matched.slice(0, 3);
            return (
              <li
                key={list.id}
                className="rounded-2xl border border-soft surface-panel p-4 shadow-soft"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <Link
                      href={`/leads?listId=${list.id}`}
                      className="text-sm font-semibold text-ink-900 hover:underline"
                    >
                      {list.name}
                    </Link>
                    <p className="text-xs text-ink-500">
                      {matched.length} lead{matched.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    aria-label="Delete list"
                    onClick={() => deleteList(list.id)}
                    className="rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {Object.entries(list.filters_json).flatMap(([k, v]) => {
                    if (v == null) return [];
                    if (Array.isArray(v) && !v.length) return [];
                    return [
                      <span
                        key={k}
                        className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] capitalize text-ink-700"
                      >
                        {k.replaceAll("_", " ")}: {Array.isArray(v) ? v.join(", ") : String(v)}
                      </span>,
                    ];
                  })}
                  {Object.keys(list.filters_json).length === 0 && (
                    <span className="text-[11px] text-ink-400">No filters yet — opens all leads.</span>
                  )}
                </div>
                {top.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {top.map((row) => (
                      <li key={row.lead.id} className="flex items-center justify-between text-xs">
                        <span className="truncate text-ink-700">{row.lead.name}</span>
                        <span className="text-ink-400">{row.lead.score}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
