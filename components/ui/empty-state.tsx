import type { ReactNode } from "react";
import clsx from "clsx";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border border-dashed border-firm bg-white/60 p-10 text-center",
        className,
      )}
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
          {icon}
        </div>
      )}
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold tracking-tightish text-ink-900">{title}</h3>
        {description && <p className="text-sm leading-relaxed text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
