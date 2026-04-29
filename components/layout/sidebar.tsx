"use client";

import { Sidebar } from "@heroui-pro/react";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  Compass,
  History,
  Inbox,
  Layers3,
  LayoutDashboard,
  Settings,
  Upload,
} from "lucide-react";
import { DarkModeToggle } from "@/components/ui/dark-mode-toggle";
import { useSnapshot } from "@/lib/store/use-snapshot";

const NAV: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/leads",     label: "Leads",    icon: Inbox },
  { href: "/tasks",     label: "Tasks",    icon: CheckSquare },
  { href: "/imports",   label: "Import",   icon: Upload },
  { href: "/lists",     label: "Lists",    icon: Layers3 },
  { href: "/finder",    label: "Finder",   icon: Compass },
  { href: "/activity",  label: "Activity", icon: History },
  { href: "/settings",  label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const snapshot = useSnapshot();
  const leadCount = snapshot.leads.length;

  return (
    <Sidebar>
      <Sidebar.Header>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-accent text-accent-foreground font-bold text-sm">
            P
          </div>
          <span className="font-semibold text-sm group-data-[collapsible=icon]:hidden">
            Perchlead
          </span>
        </div>
      </Sidebar.Header>

      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.Menu>
            {NAV.map(({ href, label, icon: Icon }) => {
              const isCurrent =
                pathname === href ||
                (href !== "/dashboard" && pathname?.startsWith(href));
              return (
                <Sidebar.MenuItem
                  key={href}
                  href={href}
                  isCurrent={isCurrent}
                  textValue={label}
                >
                  <Sidebar.MenuIcon>
                    <Icon className="h-4 w-4" />
                  </Sidebar.MenuIcon>
                  <Sidebar.MenuLabel>{label}</Sidebar.MenuLabel>
                  {label === "Leads" && leadCount > 0 && (
                    <Sidebar.MenuChip>{leadCount}</Sidebar.MenuChip>
                  )}
                </Sidebar.MenuItem>
              );
            })}
          </Sidebar.Menu>
        </Sidebar.Group>
      </Sidebar.Content>

      <Sidebar.Footer>
        <div className="flex items-center justify-between px-2 py-2 group-data-[collapsible=icon]:justify-center">
          <span className="text-xs text-muted group-data-[collapsible=icon]:hidden">
            Demo data
          </span>
          <DarkModeToggle />
        </div>
      </Sidebar.Footer>
    </Sidebar>
  );
}
