"use client";

import { RouterProvider } from "react-aria-components";
import { useRouter } from "next/navigation";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <RouterProvider navigate={router.push}>
      <ToastProvider>{children}</ToastProvider>
    </RouterProvider>
  );
}
