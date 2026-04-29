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
        "mx-auto flex max-w-sm flex-col items-center gap-5 px-6 py-12 text-center",
        className,
      )}
    >
      {/* Subtle accent line instead of a rounded icon box */}
      <div className="h-px w-12 rounded-full bg-primary-200" />
      <div className="space-y-2">
        {/* Icon before title so screen readers encounter it in document order */}
        {icon && (
          <p className="mt-1 text-ink-400" aria-hidden="true">{icon}</p>
        )}
        <h2 className="font-display text-lg font-normal tracking-tight text-ink-800">
          {title}
        </h2>
        {description && (
          <p className="text-sm leading-relaxed text-ink-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
