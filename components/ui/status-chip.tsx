import clsx from "clsx";
import type { LeadStatus } from "@/types";

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  cleaned: "Cleaned",
  enriched: "Enriched",
  qualified: "Qualified",
  contacted: "Contacted",
  replied: "Replied",
  converted: "Converted",
  rejected: "Rejected",
  do_not_contact: "Do Not Contact",
};

const STATUS_TONE: Record<LeadStatus, string> = {
  new: "bg-ink-100 text-ink-700 ring-ink-200",
  cleaned: "bg-sky-50 text-sky-700 ring-sky-200",
  enriched: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  qualified: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  contacted: "bg-blue-50 text-blue-700 ring-blue-200",
  replied: "bg-violet-50 text-violet-700 ring-violet-200",
  converted: "bg-green-50 text-green-700 ring-green-200",
  rejected: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  do_not_contact: "bg-red-50 text-red-700 ring-red-200",
};

export function StatusChip({
  status,
  size = "md",
}: {
  status: LeadStatus;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full font-medium ring-1",
        STATUS_TONE[status],
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs",
      )}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function statusLabel(status: LeadStatus) {
  return STATUS_LABEL[status];
}

export const ALL_STATUSES: LeadStatus[] = [
  "new",
  "cleaned",
  "enriched",
  "qualified",
  "contacted",
  "replied",
  "converted",
  "rejected",
  "do_not_contact",
];
