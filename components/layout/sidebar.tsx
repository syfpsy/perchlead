"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@heroui/react";
import {
  CheckSquare,
  Inbox,
  Upload,
  Layers3,
  Compass,
  LayoutDashboard,
  Settings,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";

const NAV: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }>; tagline: string }> = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, tagline: "Today at a glance" },
  { href: "/leads", label: "Leads", icon: Inbox, tagline: "Your inbox of leads" },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, tagline: "Open follow-ups across leads" },
  { href: "/imports", label: "Import", icon: Upload, tagline: "Bring messy lists in" },
  { href: "/lists", label: "Lists", icon: Layers3, tagline: "Saved views & segments" },
  { href: "/finder", label: "Finder", icon: Compass, tagline: "Discover new leads" },
  { href: "/settings", label: "Settings", icon: Settings, tagline: "Products, sources, compliance" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[232px] shrink-0 flex-col border-r border-soft surface-panel md:flex">
      <div className="flex h-14 items-center gap-2 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-soft">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tightish text-ink-900">Perchlead</p>
          <p className="text-[11px] text-ink-400">Lead memory</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <Tooltip key={item.href} placement="right" content={item.tagline} delay={500}>
              <Link
                href={item.href}
                className={clsx(
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-primary-50 text-primary-700 shadow-soft"
                    : "text-ink-600 hover:bg-ink-100/70 hover:text-ink-900",
                )}
              >
                <Icon className={clsx("h-4 w-4", active ? "text-primary-600" : "text-ink-400 group-hover:text-ink-700")} />
                <span>{item.label}</span>
              </Link>
            </Tooltip>
          );
        })}
      </nav>
      <div className="m-3 rounded-2xl border border-dashed border-firm bg-ink-50/60 p-3">
        <p className="text-xs font-medium text-ink-700">Demo data on</p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
          You're running on a local mock. Wire up Neon from{" "}
          <Link href="/settings" className="text-primary-600 hover:underline">
            settings
          </Link>{" "}
          to go live.
        </p>
      </div>
    </aside>
  );
}
