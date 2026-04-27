"use client";

import { Button } from "@heroui/react";
import { Copy, GitMerge } from "lucide-react";
import Link from "next/link";
import type { DuplicateCandidate } from "@/lib/services/dedupe-service";

export function DuplicateWarning({
  duplicates,
  onMerge,
}: {
  duplicates: DuplicateCandidate[];
  onMerge: (loserId: string) => void;
}) {
  if (!duplicates.length) return null;
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Copy className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Possible duplicate{duplicates.length === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-amber-700">
              Looks similar to {duplicates.length} existing lead{duplicates.length === 1 ? "" : "s"}.
              Merging keeps the strongest record and combines tags, interactions, and product
              interests.
            </p>
          </div>
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {duplicates.map((d) => (
          <li
            key={d.lead.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-amber-100"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-900">{d.lead.name}</p>
              <p className="truncate text-xs text-ink-500">
                {d.lead.email ?? "—"} · {d.detail}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">
                {(d.confidence * 100).toFixed(0)}%
              </span>
              <Button
                as={Link}
                href={`/leads/${d.lead.id}`}
                size="sm"
                variant="light"
                radius="full"
                className="h-7 text-xs"
              >
                Open
              </Button>
              <Button
                size="sm"
                radius="full"
                color="primary"
                variant="flat"
                className="h-7 text-xs"
                startContent={<GitMerge className="h-3 w-3" />}
                onPress={() => onMerge(d.lead.id)}
              >
                Merge in
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
