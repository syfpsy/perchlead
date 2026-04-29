"use client";

import type { ReactNode } from "react";
import { AppLayout } from "@heroui-pro/react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <>
      <AppLayout
        sidebar={<AppSidebar />}
        navbar={<Topbar />}
        sidebarCollapsible="icon"
        navigate={(href) => router.push(href)}
      >
        <main className="flex-1 overflow-x-hidden px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </AppLayout>
      <CommandPalette />
    </>
  );
}
