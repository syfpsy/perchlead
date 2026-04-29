"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/lib/heroui-compat";
import { Layers3, Pencil, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useSnapshot } from "@/lib/store/use-snapshot";
import { applyFilters, buildLeadRows } from "@/lib/services/search-service";
import { store } from "@/lib/store/data-store";
import { nid, nowIso } from "@/lib/utils/id";
import { useToast } from "@/components/ui/toast";
import { EditListModal } from "@/components/leads/edit-list-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { SavedList } from "@/types";

export default function ListsPage() {
  const snapshot = useSnapshot();
  const toast = useToast();
  const rows = useMemo(() => buildLeadRows(snapshot), [snapshot]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<SavedList | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
    setConfirmDeleteId(id);
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
              inputWrapper: "border-soft bg-panel shadow-none",
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
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/leads?view=${list.id}`}
                      className="text-sm font-semibold text-ink-900 hover:underline"
                    >
                      {list.name}
                    </Link>
                    <p className="text-xs text-ink-500">
                      {matched.length} lead{matched.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      aria-label="Edit list"
                      onClick={() => setEditing(list)}
                      className="rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-primary-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      aria-label="Delete list"
                      onClick={() => deleteList(list.id)}
                      className="rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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

      <EditListModal
        open={!!editing}
        list={editing}
        tags={snapshot.tags}
        products={snapshot.products}
        sources={snapshot.sources}
        onOpenChange={(o) => !o && setEditing(null)}
      />
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete this list?"
        description="The list will be permanently removed. Leads inside it won't be affected."
        confirmLabel="Delete list"
        isDangerous
        onConfirm={() => {
          if (confirmDeleteId) {
            store.update((s) => {
              s.lists = s.lists.filter((l) => l.id !== confirmDeleteId);
            });
            toast.push({ tone: "info", title: "List deleted" });
          }
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
