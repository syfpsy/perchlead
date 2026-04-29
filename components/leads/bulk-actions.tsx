"use client";

import { Button, Popover, PopoverContent, PopoverTrigger, Tooltip } from "@/lib/heroui-compat";
import {
  Check,
  Download,
  ShieldOff,
  Star,
  Tag as TagIcon,
  Trash2,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { LeadStatus, Product, Tag } from "@/types";
import { statusLabel } from "@/components/ui/status-chip";

export function BulkActionsBar({
  count,
  onClear,
  onSetStatus,
  onSuppress,
  onExport,
  onDelete,
  tags,
  products,
  onToggleTag,
  onSetInterest,
  exportPresets,
  onPresetExport,
}: {
  count: number;
  onClear: () => void;
  onSetStatus: (s: LeadStatus) => void;
  onSuppress: () => void;
  onExport: () => void;
  onDelete: () => void;
  tags: Tag[];
  products: Product[];
  onToggleTag: (tagId: string, mode: "add" | "remove") => void;
  onSetInterest: (productId: string, level: "low" | "medium" | "high") => void;
  exportPresets?: Array<{ key: string; label: string }>;
  onPresetExport?: (presetKey: string) => void;
}) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="bulk-bar"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          exit={{ opacity: 0, y: 16, scale: 0.96, transition: { duration: 0.12, ease: [0.4, 0, 1, 1] } }}
          className="sticky bottom-3 z-20 mx-auto flex w-fit flex-wrap items-center gap-2 rounded-full border border-soft surface-panel px-2.5 py-1.5 text-xs shadow-pop"
        >
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
            className="h-9 bg-ink-100/70 text-ink-700"
            onPress={() => onSetStatus(s)}
          >
            <Check className="h-3 w-3" /> {statusLabel(s)}
          </Button>
        ))}
      </div>

      <span className="mx-1 hidden h-4 w-px bg-soft sm:inline-block" />

      {tags.length > 0 && (
        <BulkTagMenu tags={tags} onToggleTag={onToggleTag} />
      )}
      {products.length > 0 && (
        <BulkInterestMenu products={products} onSet={onSetInterest} />
      )}

      <span className="mx-1 hidden h-4 w-px bg-soft sm:inline-block" />

      <Tooltip content="Mark as Do Not Contact">
        <Button
          size="sm"
          radius="full"
          variant="flat"
          className="h-9 bg-red-50 text-red-700"
          onPress={onSuppress}
          startContent={<ShieldOff className="h-3 w-3" />}
        >
          Suppress
        </Button>
      </Tooltip>

      <BulkExportMenu
        onExport={onExport}
        presets={exportPresets ?? []}
        onPresetExport={onPresetExport}
      />

      <Tooltip content="Delete">
        <Button
          size="sm"
          radius="full"
          variant="flat"
          className="h-9 bg-zinc-100 text-zinc-700"
          onPress={onDelete}
          startContent={<Trash2 className="h-3 w-3" />}
        >
          Delete
        </Button>
      </Tooltip>
      <button
        className="ml-1 rounded-full p-1 text-ink-400 hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        onClick={onClear}
        aria-label="Clear selection"
      >
        <X className="h-3.5 w-3.5" />
      </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BulkTagMenu({
  tags,
  onToggleTag,
}: {
  tags: Tag[];
  onToggleTag: (tagId: string, mode: "add" | "remove") => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover isOpen={open} onOpenChange={setOpen} placement="top">
      <PopoverTrigger>
        <Button
          size="sm"
          radius="full"
          variant="flat"
          className="h-7 bg-ink-100/70 text-ink-700"
          startContent={<TagIcon className="h-3 w-3" />}
        >
          Tag
        </Button>
      </PopoverTrigger>
      <PopoverContent className="rounded-2xl border border-soft p-2 shadow-pop">
        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          Apply to selected
        </p>
        <ul className="max-h-60 min-w-[200px] space-y-0.5 overflow-y-auto">
          {tags.map((tag) => (
            <li key={tag.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-ink-100/60">
              <span className="flex items-center gap-2 text-xs text-ink-800">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </span>
              <span className="flex items-center gap-1">
                <button
                  onClick={() => onToggleTag(tag.id, "add")}
                  className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50"
                  aria-label={`Add ${tag.name}`}
                >
                  + add
                </button>
                <button
                  onClick={() => onToggleTag(tag.id, "remove")}
                  className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-50"
                  aria-label={`Remove ${tag.name}`}
                >
                  − remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function BulkInterestMenu({
  products,
  onSet,
}: {
  products: Product[];
  onSet: (productId: string, level: "low" | "medium" | "high") => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover isOpen={open} onOpenChange={setOpen} placement="top">
      <PopoverTrigger>
        <Button
          size="sm"
          radius="full"
          variant="flat"
          className="h-7 bg-ink-100/70 text-ink-700"
          startContent={<Star className="h-3 w-3" />}
        >
          Interest
        </Button>
      </PopoverTrigger>
      <PopoverContent className="rounded-2xl border border-soft p-2 shadow-pop">
        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          Set interest level
        </p>
        <ul className="max-h-60 min-w-[260px] space-y-0.5 overflow-y-auto">
          {products.map((p) => (
            <li key={p.id} className="rounded-lg px-2 py-1 hover:bg-ink-100/60">
              <p className="truncate text-xs font-medium text-ink-800">{p.name}</p>
              <div className="mt-1 flex items-center gap-1">
                {(["low", "medium", "high"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => onSet(p.id, level)}
                    className={clsx(
                      "flex-1 rounded-md py-0.5 text-[10px] font-medium ring-1 transition",
                      level === "high"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                        : level === "medium"
                          ? "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100"
                          : "bg-ink-50 text-ink-700 ring-soft hover:bg-ink-100",
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function BulkExportMenu({
  onExport,
  presets,
  onPresetExport,
}: {
  onExport: () => void;
  presets: Array<{ key: string; label: string }>;
  onPresetExport?: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!presets.length || !onPresetExport) {
    // No presets configured — single button.
    return (
      <Tooltip content="Export selected as CSV (suppressed leads excluded)">
        <Button
          size="sm"
          radius="full"
          variant="flat"
          className="h-9 bg-emerald-50 text-emerald-700"
          onPress={onExport}
          startContent={<Download className="h-3 w-3" />}
        >
          Export
        </Button>
      </Tooltip>
    );
  }
  return (
    <Popover isOpen={open} onOpenChange={setOpen} placement="top">
      <PopoverTrigger>
        <Button
          size="sm"
          radius="full"
          variant="flat"
          className="h-9 bg-emerald-50 text-emerald-700"
          startContent={<Download className="h-3 w-3" />}
        >
          Export
        </Button>
      </PopoverTrigger>
      <PopoverContent className="rounded-2xl border border-soft p-2 shadow-pop">
        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          Pick a format
        </p>
        <ul className="min-w-[220px] space-y-0.5">
          <li>
            <button
              onClick={() => {
                onExport();
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-ink-100/60"
            >
              <span className="font-medium text-ink-800">Generic CSV</span>
              <span className="text-[10px] text-ink-500">Default</span>
            </button>
          </li>
          {presets.map((p) => (
            <li key={p.key}>
              <button
                onClick={() => {
                  onPresetExport(p.key);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-ink-100/60"
              >
                <span className="font-medium text-ink-800">{p.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-1 border-t border-soft px-2 pt-1.5 text-[10px] text-ink-400">
          Suppressed leads are excluded from every preset.
        </p>
      </PopoverContent>
    </Popover>
  );
}
