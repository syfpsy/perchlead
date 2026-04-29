"use client";

import Link from "next/link";
import { Button, Input } from "@heroui/react";
import { Plus, Search, Upload } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function Topbar() {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const editing = tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;
      if (editing) return;
      if (e.key === "/") {
        e.preventDefault();
        const el = document.getElementById("global-search") as HTMLInputElement | null;
        el?.focus();
      }
      if (e.key.toLowerCase() === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        router.push("/leads?new=1");
      }
      if (e.key.toLowerCase() === "i" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        router.push("/imports");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-soft bg-panel/80 px-4 backdrop-blur md:px-6">
      <form
        role="search"
        className="flex-1 max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const q = String(data.get("q") ?? "").trim();
          router.push(q ? `/leads?q=${encodeURIComponent(q)}` : "/leads");
        }}
      >
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-ink-400" aria-hidden="true" />
          <Input
            id="global-search"
            name="q"
            aria-label="Search leads"
            placeholder="Search leads, companies, tags…"
            variant="secondary"
            className="w-full pl-9 pr-16 text-sm"
          />
          <kbd className="absolute right-3 hidden rounded border border-firm bg-panel px-1 py-0.5 text-[10px] text-ink-400 sm:inline-block">
            Cmd+K
          </kbd>
        </div>
      </form>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="hidden text-sm sm:inline-flex"
        >
          <Link href="/imports" className="inline-flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Link>
        </Button>
        <Button
          variant="primary"
          className="text-sm font-medium"
        >
          <Link href="/leads?new=1" className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add lead
          </Link>
        </Button>
      </div>
    </header>
  );
}
