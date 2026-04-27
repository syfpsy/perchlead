"use client";

import { Button, Tooltip } from "@heroui/react";
import {
  Check,
  Download,
  ShieldOff,
  Trash2,
  X,
} from "lucide-react";
import type { LeadStatus } from "@/types";
import { statusLabel } from "@/components/ui/status-chip";

export function BulkActionsBar({
  count,
  onClear,
  onSetStatus,
  onSuppress,
  onExport,
  onDelete,
}: {
  count: number;
  onClear: () => void;
  onSetStatus: (s: LeadStatus) => void;
  onSuppress: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="sticky bottom-3 z-20 mx-auto flex w-fit items-center gap-2 rounded-full border border-soft surface-panel px-2.5 py-1.5 text-xs shadow-pop animate-fade-in">
      <span className="rounded-full bg-primary-50 px-2 py-1 font-semibold text-primary-700">
        {count} selected
      </span>
      <span className="hidden text-ink-500 sm:inline">Mark as</span>
      <div className="flex flex-wrap items-center gap-1">
        {(["new", "qualified", "contacted", "replied", "converted", "rejected"] as LeadStatus[]).map((s) => (
          <Button
            key={s}
            size="sm"
            radius="full"
            variant="flat"
            className="h-7 bg-ink-100/70 text-ink-700"
            onPress={() => onSetStatus(s)}
          >
            <Check className="h-3 w-3" /> {statusLabel(s)}
          </Button>
        ))}
      </div>
      <span className="mx-1 hidden h-4 w-px bg-soft sm:inline-block" />
      <Tooltip content="Mark as Do Not Contact">
        <Button
          size="sm"
          radius="full"
          variant="flat"
          className="h-7 bg-red-50 text-red-700"
          onPress={onSuppress}
          startContent={<ShieldOff className="h-3 w-3" />}
        >
          Suppress
        </Button>
      </Tooltip>
      <Tooltip content="Export selected as CSV (suppressed leads excluded)">
        <Button
          size="sm"
          radius="full"
          variant="flat"
          className="h-7 bg-emerald-50 text-emerald-700"
          onPress={onExport}
          startContent={<Download className="h-3 w-3" />}
        >
          Export
        </Button>
      </Tooltip>
      <Tooltip content="Delete">
        <Button
          size="sm"
          radius="full"
          variant="flat"
          className="h-7 bg-zinc-100 text-zinc-700"
          onPress={onDelete}
          startContent={<Trash2 className="h-3 w-3" />}
        >
          Delete
        </Button>
      </Tooltip>
      <button
        className="ml-1 rounded-full p-1 text-ink-400 hover:bg-ink-100"
        onClick={onClear}
        aria-label="Clear selection"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
