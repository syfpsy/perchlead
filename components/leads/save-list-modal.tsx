"use client";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { useEffect, useState } from "react";
import { Layers3 } from "lucide-react";
import type { LeadFilters } from "@/types";
import { store } from "@/lib/store/data-store";
import { nid, nowIso } from "@/lib/utils/id";

export function SaveListModal({
  open,
  filters,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  filters: LeadFilters;
  onOpenChange: (open: boolean) => void;
  onSaved: (id: string) => void;
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName(suggestName(filters));
  }, [open, filters]);

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = nid("list");
    store.update((s) => {
      s.lists.push({
        id,
        owner_id: s.current_user.id,
        name: trimmed,
        filters_json: stripQuery(filters),
        created_at: nowIso(),
        updated_at: nowIso(),
      });
    });
    onSaved(id);
    onOpenChange(false);
  }

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange} size="md" placement="center">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <Layers3 className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-base font-semibold text-ink-900">Save current filters as a list</h3>
          </div>
          <p className="text-xs text-ink-500">
            Lists are reusable filters. The search box doesn't get saved — it stays per-session.
          </p>
        </ModalHeader>
        <ModalBody className="space-y-3">
          <Input
            autoFocus
            label="List name"
            value={name}
            onValueChange={setName}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <FilterPreview filters={stripQuery(filters)} />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button color="primary" onPress={save} isDisabled={!name.trim()}>
            Save list
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function FilterPreview({ filters }: { filters: LeadFilters }) {
  const chips = describeFilters(filters);
  return (
    <div className="rounded-2xl border border-soft bg-panel p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        Will be saved
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {chips.length === 0 ? (
          <span className="text-xs text-ink-400">
            No filters set — this list will match every lead.
          </span>
        ) : (
          chips.map((c) => (
            <span
              key={c}
              className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-700"
            >
              {c}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function describeFilters(filters: LeadFilters): string[] {
  const out: string[] = [];
  if (filters.statuses?.length) out.push(`status: ${filters.statuses.join(", ")}`);
  if (filters.tag_ids?.length) out.push(`${filters.tag_ids.length} tag(s)`);
  if (filters.product_ids?.length) out.push(`${filters.product_ids.length} product(s)`);
  if (filters.source_types?.length)
    out.push(`source: ${filters.source_types.join(", ")}`);
  if (typeof filters.score_min === "number") out.push(`score ≥ ${filters.score_min}`);
  if (typeof filters.score_max === "number") out.push(`score ≤ ${filters.score_max}`);
  if (typeof filters.is_suppressed === "boolean")
    out.push(filters.is_suppressed ? "only suppressed" : "hide suppressed");
  if (filters.has_email === true) out.push("has email");
  if (filters.has_email === false) out.push("no email");
  if (filters.has_company === true) out.push("has company");
  return out;
}

function suggestName(filters: LeadFilters): string {
  const parts: string[] = [];
  if (filters.statuses?.length) parts.push(filters.statuses.join("/"));
  if (typeof filters.score_min === "number") parts.push(`${filters.score_min}+`);
  if (filters.has_email === false) parts.push("no email");
  if (filters.is_suppressed === true) parts.push("suppressed");
  return parts.length ? parts.join(" · ") : "Untitled list";
}

function stripQuery(filters: LeadFilters): LeadFilters {
  const { query: _query, ...rest } = filters;
  return rest;
}
