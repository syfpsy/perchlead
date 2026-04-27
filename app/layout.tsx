import type { Metadata } from "next";
import "./globals.css";
// Note: do NOT import "@heroui-pro/react/css" here. The Pro stylesheet is
// authored against Tailwind 4 (`@layer properties { @supports ... }`) which
// our PostCSS+Tailwind 3 pipeline cannot parse. Pro adoption requires
// migrating to Tailwind 4 + React 19 + @heroui/react v3 — see
// docs/HEROUI_PRO_SETUP.md.
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Perchlead — Lead memory for indie founders",
  description:
    "Throw messy leads in. Perchlead cleans, dedupes, scores, organizes, and tells you who to follow up with next.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen surface-app text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
