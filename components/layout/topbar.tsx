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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-soft bg-white/80 px-4 backdrop-blur dark:bg-ink-950/90 md:px-6">
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
        <Input
          id="global-search"
          name="q"
          aria-label="Search leads"
          placeholder="Search leads, companies, tags…"
          startContent={<Search className="h-4 w-4 text-ink-400" />}
          endContent={
            <span className="hidden items-center gap-1 text-[10px] text-ink-400 sm:flex">
              <kbd className="rounded border border-firm bg-white dark:bg-ink-800 px-1 py-0.5">⌘K</kbd>
            </span>
          }
          radius="lg"
          variant="bordered"
          classNames={{
            inputWrapper: "border-soft bg-white shadow-none data-[hover=true]:border-firm dark:bg-ink-900",
            input: "text-sm",
          }}
        />
      </form>
      <div className="flex items-center gap-2">
        <Button
          as={Link}
          href="/imports"
          variant="bordered"
          radius="lg"
          startContent={<Upload className="h-4 w-4" />}
          className="hidden border-soft bg-white text-sm text-ink-700 dark:bg-ink-900 sm:inline-flex"
        >
          Import
        </Button>
        <Button
          as={Link}
          href="/leads?new=1"
          color="primary"
          radius="lg"
          startContent={<Plus className="h-4 w-4" />}
          className="text-sm font-medium"
        >
          Add lead
        </Button>
      </div>
    </header>
  );
}
