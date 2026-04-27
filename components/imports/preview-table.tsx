"use client";

import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Copy, ShieldOff } from "lucide-react";
import type { NormalizedRow } from "@/lib/services/import-service";

export function PreviewTable({ rows }: { rows: NormalizedRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-soft surface-panel shadow-soft">
      <div className="max-h-[420px] overflow-auto scrollbar-thin">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-ink-50/80 backdrop-blur text-xs uppercase tracking-wider text-ink-500">
            <tr>
              <th className="w-9 px-3 py-2" />
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Company</th>
              <th className="px-3 py-2 text-left">Website</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const top = row.duplicates[0];
              const dupe = top && top.confidence >= 0.85;
              const status = row.errors.length
                ? "error"
                : row.willSuppress
                  ? "suppress"
                  : dupe
                    ? "duplicate"
                    : "ok";
              return (
                <tr
                  key={idx}
                  className={clsx(
                    "border-t border-soft text-ink-800",
                    status === "error" && "bg-red-50/50",
                    status === "suppress" && "bg-red-50/30",
                    status === "duplicate" && "bg-amber-50/40",
                  )}
                >
                  <td className="px-3 py-2 text-ink-400">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium">{row.normalized.name}</td>
                  <td className="px-3 py-2">{row.normalized.email ?? <span className="text-ink-400">—</span>}</td>
                  <td className="px-3 py-2">{row.normalized.company_name ?? <span className="text-ink-400">—</span>}</td>
                  <td className="px-3 py-2">
                    {row.normalized.website ? (
                      <span className="truncate text-xs text-ink-500">
                        {row.normalized.website.replace(/^https?:\/\//, "")}
                      </span>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={status} detail={row.errors[0] ?? top?.detail} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({
  status,
  detail,
}: {
  status: "ok" | "error" | "duplicate" | "suppress";
  detail?: string;
}) {
  if (status === "error") {
    return (
      <span title={detail} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700">
        <AlertTriangle className="h-3 w-3" /> Error
      </span>
    );
  }
  if (status === "duplicate") {
    return (
      <span title={detail} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
        <Copy className="h-3 w-3" /> Duplicate
      </span>
    );
  }
  if (status === "suppress") {
    return (
      <span title="Will be marked Do Not Contact" className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700">
        <ShieldOff className="h-3 w-3" /> Suppress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
      <CheckCircle2 className="h-3 w-3" /> Ready
    </span>
  );
}
