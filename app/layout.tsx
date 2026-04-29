import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Perchlead — Lead memory for indie founders",
  description:
    "Throw messy leads in. Perchlead cleans, dedupes, scores, organizes, and tells you who to follow up with next.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={instrumentSans.variable}>
      <head>
        {/* Inline script prevents dark-mode flash before React hydrates. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('perchlead.theme'),p=window.matchMedia('(prefers-color-scheme:dark)').matches,d=t==='dark'||(t===null&&p);if(d){document.documentElement.classList.add('dark');document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.setAttribute('data-theme','light');}})();`,
          }}
        />
      </head>
      <body className="min-h-screen surface-app text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
