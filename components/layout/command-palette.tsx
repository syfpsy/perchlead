"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Compass,
  Database,
  History,
  Inbox,
  Layers3,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  ShieldOff,
  Sparkles,
  Upload,
} from "lucide-react";
import clsx from "clsx";

import { useSnapshot } from "@/lib/store/use-snapshot";
import { Avatar } from "@/components/ui/avatar";
import { ScoreBadge } from "@/components/ui/score-badge";
import { store } from "@/lib/store/data-store";
import { useToast } from "@/components/ui/toast";
import type { ScoreResult } from "@/types";

type CommandKind = "command" | "lead" | "list";

interface PaletteItem {
  id: string;
  kind: CommandKind;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  keywords: string;
  action: () => void;
  leadData?: { score: number; score_reason: ScoreResult | null | undefined; is_suppressed: boolean };
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const snapshot = useSnapshot();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl + K opens; Esc closes; / + Cmd reopens.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        return;
      }
      // ? opens the palette unless an input is focused.
      if (e.key === "?" && !target?.matches("input, textarea, [contenteditable]")) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // Defer focus until after the modal animates in.
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items: PaletteItem[] = useMemo(() => {
    const commands: PaletteItem[] = [
      {
        id: "cmd:add",
        kind: "command",
        label: "Add a lead",
        hint: "Cmd/Ctrl + N",
        icon: <Plus className="h-4 w-4" />,
        keywords: "add lead create new",
        action: () => router.push("/leads?new=1"),
      },
      {
        id: "cmd:import",
        kind: "command",
        label: "Import leads",
        hint: "Cmd/Ctrl + I",
        icon: <Upload className="h-4 w-4" />,
        keywords: "import csv paste upload",
        action: () => router.push("/imports"),
      },
      {
        id: "cmd:inbox",
        kind: "command",
        label: "Open inbox",
        icon: <Inbox className="h-4 w-4" />,
        keywords: "leads inbox triage",
        action: () => router.push("/leads"),
      },
      {
        id: "cmd:tasks",
        kind: "command",
        label: "Open tasks",
        icon: <CheckSquare className="h-4 w-4" />,
        keywords: "tasks todo follow up",
        action: () => router.push("/tasks"),
      },
      {
        id: "cmd:dashboard",
        kind: "command",
        label: "Overview",
        icon: <LayoutDashboard className="h-4 w-4" />,
        keywords: "dashboard overview home",
        action: () => router.push("/dashboard"),
      },
      {
        id: "cmd:lists",
        kind: "command",
        label: "Lists",
        icon: <Layers3 className="h-4 w-4" />,
        keywords: "lists segments saved views",
        action: () => router.push("/lists"),
      },
      {
        id: "cmd:finder",
        kind: "command",
        label: "Lead Finder",
        icon: <Compass className="h-4 w-4" />,
        keywords: "finder discover search",
        action: () => router.push("/finder"),
      },
      {
        id: "cmd:activity",
        kind: "command",
        label: "Activity log",
        icon: <History className="h-4 w-4" />,
        keywords: "activity audit log history compliance",
        action: () => router.push("/activity"),
      },
      {
        id: "cmd:settings",
        kind: "command",
        label: "Settings",
        icon: <Settings className="h-4 w-4" />,
        keywords: "settings products tags sources compliance",
        action: () => router.push("/settings"),
      },
      {
        id: "cmd:reset-demo",
        kind: "command",
        label: "Restore demo data",
        hint: "Replaces local workspace",
        icon: <Sparkles className="h-4 w-4" />,
        keywords: "demo reset seed sample",
        action: () => {
          if (!window.confirm("Replace your local data with a fresh demo set?")) return;
          store.reset(true);
          toast.push({ tone: "info", title: "Demo data restored" });
        },
      },
      {
        id: "cmd:clear",
        kind: "command",
        label: "Clear all data",
        hint: "Empty workspace",
        icon: <Database className="h-4 w-4" />,
        keywords: "clear empty wipe reset",
        action: () => {
          if (!window.confirm("Clear all local data? This cannot be undone.")) return;
          store.reset(false);
          toast.push({ tone: "info", title: "Workspace cleared" });
        },
      },
    ];

    const lists: PaletteItem[] = snapshot.lists.map((list) => ({
      id: `list:${list.id}`,
      kind: "list",
      label: list.name,
      hint: "Saved list",
      icon: <Layers3 className="h-4 w-4 text-ink-400" />,
      keywords: `list view ${list.name}`,
      action: () => router.push(`/leads`), // The inbox listens to its own state; jump there.
    }));

    const leads: PaletteItem[] = snapshot.leads.slice(0, 200).map((lead) => ({
      id: `lead:${lead.id}`,
      kind: "lead",
      label: lead.name,
      hint: lead.email ?? lead.title ?? lead.location ?? "",
      icon: <Avatar name={lead.name} size="sm" />,
      keywords: [
        lead.name,
        lead.email,
        lead.title,
        lead.location,
        snapshot.companies.find((c) => c.id === lead.company_id)?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      action: () => router.push(`/leads/${lead.id}`),
      leadData: { score: lead.score, score_reason: lead.score_reason, is_suppressed: lead.is_suppressed },
    }));

    return [...commands, ...lists, ...leads];
  }, [router, snapshot.lists, snapshot.leads, snapshot.companies, toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.filter((i) => i.kind === "command").slice(0, 12);
    return items
      .filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.keywords.includes(q) ||
          (i.hint ?? "").toLowerCase().includes(q),
      )
      .slice(0, 18);
  }, [items, query]);

  useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered, active]);

  function runItem(item?: PaletteItem) {
    const target = item ?? filtered[active];
    if (!target) return;
    target.action();
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        className="sr-only"
      />
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink-900/50 px-4 pt-24 animate-fade-in supports-[backdrop-filter]:bg-ink-900/40 supports-[backdrop-filter]:backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-soft surface-panel shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-soft px-4">
          <Search className="h-4 w-4 text-ink-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(filtered.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                runItem();
              }
            }}
            placeholder="Search commands, leads, lists…"
            className="flex-1 bg-transparent py-3 text-sm text-ink-900 outline-none placeholder:text-ink-400"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="rounded border border-firm bg-white px-1.5 py-0.5 text-[10px] text-ink-500">
            Esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-ink-500">
              No matches. Try “add lead”, “import”, a lead name, or a list.
            </div>
          ) : (
            <ul>
              {filtered.map((item, idx) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => runItem(item)}
                    className={clsx(
                      "flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition",
                      active === idx ? "bg-primary-50" : "hover:bg-ink-50/70",
                    )}
                  >
                    <span
                      className={clsx(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        active === idx
                          ? "bg-primary-100 text-primary-700"
                          : "bg-ink-100 text-ink-600",
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink-900">{item.label}</span>
                      {item.hint && (
                        <span className="block truncate text-[11px] text-ink-500">{item.hint}</span>
                      )}
                    </span>
                    {item.kind === "lead" && item.leadData && (
                      <LeadAffordance
                        score={item.leadData.score}
                        scoreReason={item.leadData.score_reason}
                        isSuppressed={item.leadData.is_suppressed}
                      />
                    )}
                    {item.kind === "command" && active === idx && (
                      <kbd className="rounded border border-firm bg-white px-1.5 py-0.5 text-[10px] text-ink-500">
                        ↵
                      </kbd>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-soft bg-ink-50/40 px-4 py-2 text-[11px] text-ink-500">
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-firm bg-white px-1 py-0.5">↑</kbd>
              <kbd className="rounded border border-firm bg-white px-1 py-0.5">↓</kbd>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-firm bg-white px-1 py-0.5">↵</kbd>
              run
            </span>
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-firm bg-white px-1 py-0.5">⌘</kbd>
            <kbd className="rounded border border-firm bg-white px-1 py-0.5">K</kbd>
          </span>
        </footer>
      </div>
    </div>
  );
}

function LeadAffordance({ score, scoreReason, isSuppressed }: {
  score: number;
  scoreReason?: ScoreResult | null;
  isSuppressed: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      {isSuppressed && (
        <span title="Do Not Contact" className="text-red-500">
          <ShieldOff className="h-3.5 w-3.5" />
        </span>
      )}
      <ScoreBadge score={score} reason={scoreReason} size="sm" hideTooltip />
    </span>
  );
}

