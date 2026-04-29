"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  Compass,
  History,
  Inbox,
  Layers3,
  LayoutDashboard,
  MoreHorizontal,
  Settings,
  Upload,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useState } from "react";

const PRIMARY_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Inbox },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/imports", label: "Import", icon: Upload },
];

const MORE_ITEMS = [
  { href: "/finder", label: "Finder", icon: Compass },
  { href: "/lists", label: "Lists", icon: Layers3 },
  { href: "/activity", label: "Activity", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = MORE_ITEMS.some(
    (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`),
  );

  return (
    <>
      {/* More panel overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute bottom-[57px] left-0 right-0 border-t border-soft bg-white/98 px-4 py-3 backdrop-blur-sm dark:bg-ink-950/98"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-4 gap-2">
              {MORE_ITEMS.map((item) => {
                const active =
                  pathname === item.href || pathname?.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={clsx(
                      "flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-[11px] font-medium transition",
                      active
                        ? "bg-primary-50 text-primary-700"
                        : "text-ink-600 hover:bg-ink-100",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Mobile navigation"
        className="sticky bottom-0 z-50 flex border-t border-soft bg-white/95 backdrop-blur md:hidden dark:bg-ink-950/95"
      >
        {PRIMARY_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition",
                active ? "text-primary-700" : "text-ink-500",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}

        {/* More button */}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-label={moreOpen ? "Close more menu" : "More navigation options"}
          aria-expanded={moreOpen}
          className={clsx(
            "flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500",
            moreOpen || moreActive ? "text-primary-700" : "text-ink-500",
          )}
        >
          {moreOpen ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
          {moreOpen ? "Close" : "More"}
        </button>
      </nav>
    </>
  );
}
