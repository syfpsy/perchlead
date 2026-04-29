import type { Metadata } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
// Note: do NOT import "@heroui-pro/react/css" here. The Pro stylesheet is
// authored against Tailwind 4 (`@layer properties { @supports ... }`) which
// our PostCSS+Tailwind 3 pipeline cannot parse. Pro adoption requires
// migrating to Tailwind 4 + React 19 + @heroui/react v3 — see
// docs/HEROUI_PRO_SETUP.md.
import { Providers } from "./providers";

const displayFont = Instrument_Serif({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sansFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Perchlead — Lead memory for indie founders",
  description:
    "Throw messy leads in. Perchlead cleans, dedupes, scores, organizes, and tells you who to follow up with next.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${displayFont.variable} ${sansFont.variable}`}>
      <head>
        {/* Inline script prevents dark-mode flash before React hydrates. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('perchlead.theme'),p=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t===null&&p))document.documentElement.classList.add('dark');})();`,
          }}
        />
      </head>
      <body className="min-h-screen surface-app text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
