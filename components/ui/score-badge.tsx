"use client";

import { Tooltip } from "@/lib/heroui-compat";
import clsx from "clsx";
import type { ScoreResult } from "@/types";

export function ScoreBadge({
  score,
  reason,
  size = "md",
  hideTooltip,
}: {
  score: number;
  reason?: ScoreResult | null;
  size?: "sm" | "md" | "lg";
  hideTooltip?: boolean;
}) {
  const tone =
    score >= 80
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : score >= 60
        ? "bg-blue-50 text-blue-700 ring-blue-200"
        : score >= 40
          ? "bg-amber-50 text-amber-700 ring-amber-200"
          : score > 0
            ? "bg-zinc-100 text-zinc-700 ring-zinc-200"
            : "bg-red-50 text-red-700 ring-red-200";

  const padding =
    size === "lg"
      ? "px-3 py-1.5 text-base"
      : size === "sm"
        ? "px-1.5 py-0.5 text-[11px]"
        : "px-2 py-1 text-xs";

  const inner = (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full ring-1 font-semibold tabular-nums",
        padding,
        tone,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {score}
    </span>
  );

  if (hideTooltip || !reason) return inner;

  return (
    <Tooltip
      placement="top"
      content={
        <div className="max-w-xs space-y-1.5 p-1 text-xs">
          <p className="font-medium text-ink-800">Score breakdown</p>
          <ul className="space-y-1">
            {reason.reasons.map((r, idx) => (
              <li key={idx} className="flex items-center justify-between gap-3">
                <span className="capitalize text-ink-600">
                  {r.signal.replaceAll("_", " ")}
                </span>
                <span
                  className={clsx(
                    "tabular-nums",
                    r.delta > 0 ? "text-emerald-600" : r.delta < 0 ? "text-red-600" : "text-ink-500",
                  )}
                >
                  {r.delta > 0 ? "+" : ""}
                  {r.delta}
                </span>
              </li>
            ))}
          </ul>
          {reason.warnings.length > 0 && (
            <p className="border-t border-ink-100 pt-1 text-[11px] text-amber-700">
              {reason.warnings.join(" ")}
            </p>
          )}
        </div>
      }
    >
      {inner}
    </Tooltip>
  );
}
