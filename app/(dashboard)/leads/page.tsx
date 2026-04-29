"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Tab, Tabs, Tooltip } from "@/lib/heroui-compat";
import {
  BookmarkPlus,
  Download,
  Filter as FilterIcon,
  Inbox,
  KanbanSquare,
  Plus,
  Rows3,
  Rows4,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";

import { useSnapshot } from "@/lib/store/use-snapshot";
import {
  applyFilters,
  buildLeadRows,
  sortRows,
  type SortKey,
} from "@/lib/services/search-service";
import {
  addTagToLead,
  deleteLead,
  removeTagFromLead,
  setLeadProductInterest,
  setLeadStatus,
  suppressLead,
} from "@/lib/services/lead-service";
import {
  EXPORT_PRESET_LIST,
  downloadCsv,
  type ExportPresetKey,
} from "@/lib/services/export-service";
import { useToast } from "@/components/ui/toast";

import { PageHeader } from "@/components/ui/page-header";
import { LeadTable, type Density } from "@/components/leads/lead-table";
import { LeadBoard } from "@/components/leads/lead-board";
import { LeadFilterBar } from "@/components/leads/lead-filters";
import { BulkActionsBar } from "@/components/leads/bulk-actions";
import { LeadCreateModal } from "@/components/leads/lead-create-modal";
import { SaveListModal } from "@/components/leads/save-list-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { findStale } from "@/lib/services/staleness-service";
import { writeInboxCursor } from "@/lib/store/inbox-cursor";
import type { LeadFilters, LeadStatus } from "@/types";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "score", label: "Score" },
  { key: "updated", label: "Updated" },
  { key: "created", label: "Created" },
  { key: "name", label: "Name" },
];

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsPageInner />
    </Suspense>
  );
}

function LeadsPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const snapshot = useSnapshot();
  const toast = useToast();

  const [filters, setFilters] = useState<LeadFilters>({});
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [saveListOpen, setSaveListOpen] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [activeListId, setActiveListId] = useState<string>("all");
  const [density, setDensity] = useState<Density>("comfortable");
  const [viewMode, setViewMode] = useState<"table" | "board">("table");

  // Hydrate display preferences from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("perchlead.inbox_density");
    if (saved === "comfortable" || saved === "compact") setDensity(saved);
    const savedView = window.localStorage.getItem("perchlead.inbox_view");
    if (savedView === "table" || savedView === "board") setViewMode(savedView);
  }, []);

  // Sync ?q=, ?new=1, ?view= from the topbar / sidebar / dashboard.
  useEffect(() => {
    const q = params.get("q");
    if (q !== null) setFilters((cur) => ({ ...cur, query: q }));
    const view = params.get("view");
    if (view) setActiveListId(view);
    if (params.get("new") === "1") {
      setCreateOpen(true);
      router.replace("/leads");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const allRows = useMemo(() => buildLeadRows(snapshot), [snapshot]);
  const staleSet = useMemo(
    () => new Set(findStale(allRows).map((r) => r.lead.id)),
    [allRows],
  );

  const effectiveFilters: LeadFilters = useMemo(() => {
    if (activeListId === "all") return filters;
    if (activeListId === "new") return { ...filters, statuses: ["new"] };
    if (activeListId === "qualified") return { ...filters, statuses: ["qualified"] };
    if (activeListId === "needs_followup") {
      return { ...filters, statuses: ["contacted", "replied"] };
    }
    if (activeListId === "stale") return filters; // applied via staleSet below
    if (activeListId === "suppressed") return { ...filters, is_suppressed: true };
    const list = snapshot.lists.find((l) => l.id === activeListId);
    if (list) return { ...list.filters_json, query: filters.query };
    return filters;
  }, [activeListId, filters, snapshot.lists]);

  const filteredRows = useMemo(() => {
    let rows = applyFilters(allRows, effectiveFilters);
    if (activeListId === "stale") rows = rows.filter((r) => staleSet.has(r.lead.id));
    return sortRows(rows, sortKey);
  }, [allRows, effectiveFilters, sortKey, activeListId, staleSet]);

  // Persist the filtered+sorted ID list so j/k nav on the profile respects
  // whatever the user is currently looking at.
  useEffect(() => {
    const list = snapshot.lists.find((l) => l.id === activeListId);
    const label =
      activeListId === "all"
        ? "All leads"
        : activeListId === "new"
          ? "New leads"
          : activeListId === "qualified"
            ? "Qualified"
            : activeListId === "needs_followup"
              ? "Follow up"
              : activeListId === "stale"
                ? "Stale"
                : activeListId === "suppressed"
                  ? "Suppressed"
                  : list?.name ?? "Leads";
    writeInboxCursor({ ids: filteredRows.map((r) => r.lead.id), label });
  }, [filteredRows, activeListId, snapshot.lists]);

  const isEmpty = allRows.length === 0;
  const filteredEmpty = !isEmpty && filteredRows.length === 0;
  const hasSaveable =
    activeListId === "all" &&
    Object.values(filters).some((v) => {
      if (v == null) return false;
      if (typeof v === "string") return v.trim().length > 0 && v !== filters.query;
      if (Array.isArray(v)) return v.length > 0;
      return true;
    }) &&
    // The free-text query stays per-session, so it doesn't make a filter
    // "saveable" on its own.
    Object.entries(filters).some(([k, v]) => k !== "query" && v != null);

  const select = (id: string, checked: boolean) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const selectedRows = filteredRows.filter((r) => selected.has(r.lead.id));

  const onBulkStatus = (s: LeadStatus) => {
    selectedRows.forEach((r) => setLeadStatus(r.lead.id, s));
    toast.push({ tone: "success", title: `Marked ${selected.size} as ${s.replaceAll("_", " ")}.` });
  };
  const onBulkSuppress = () => {
    selectedRows.forEach((r) => suppressLead(r.lead.id, "Bulk action from inbox"));
    toast.push({
      tone: "info",
      title: `Suppressed ${selected.size} lead${selected.size === 1 ? "" : "s"}.`,
      description: "They won't be exported for outreach.",
    });
    setSelected(new Set());
  };
  const onBulkDelete = () => {
    setConfirmBulkDeleteOpen(true);
  };
  const onBulkExport = () => {
    if (!selectedRows.length) return;
    downloadCsv(selectedRows);
    toast.push({
      tone: "success",
      title: "Export started",
      description: "Suppressed leads were excluded for safety.",
    });
  };
  const onBulkPresetExport = (presetKey: string) => {
    if (!selectedRows.length) return;
    const key = presetKey as ExportPresetKey;
    const preset = EXPORT_PRESET_LIST.find((p) => p.key === key);
    downloadCsv(selectedRows, { preset: key });
    toast.push({
      tone: "success",
      title: `${preset?.label ?? "Preset"} export started`,
      description: "Suppressed leads were excluded for safety.",
    });
  };
  const onBulkTag = (tagId: string, mode: "add" | "remove") => {
    selectedRows.forEach((r) =>
      mode === "add" ? addTagToLead(r.lead.id, tagId) : removeTagFromLead(r.lead.id, tagId),
    );
    const tag = snapshot.tags.find((t) => t.id === tagId);
    toast.push({
      tone: mode === "add" ? "success" : "info",
      title:
        mode === "add"
          ? `Tagged ${selectedRows.length} as "${tag?.name ?? "?"}"`
          : `Removed "${tag?.name ?? "?"}" from ${selectedRows.length}`,
    });
  };
  const onBulkInterest = (productId: string, level: "low" | "medium" | "high") => {
    selectedRows.forEach((r) =>
      setLeadProductInterest({ leadId: r.lead.id, productId, level }),
    );
    const product = snapshot.products.find((p) => p.id === productId);
    toast.push({
      tone: "success",
      title: `${product?.name ?? "Product"} interest set to ${level} (${selectedRows.length})`,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lead Inbox"
        description="Your single place to triage, score, and follow up. Import a messy list or paste rows from a sheet — Perchlead will clean them."
        actions={
          <>
            <Button
              variant="bordered"
              radius="lg"
              className="border-soft bg-panel text-sm"
              startContent={<FilterIcon className="h-4 w-4" />}
              onPress={() => setShowFilters((v) => !v)}
            >
              {showFilters ? "Hide filters" : "Filters"}
            </Button>
            <Button
              as={Link}
              href="/imports"
              variant="bordered"
              radius="lg"
              startContent={<Upload className="h-4 w-4" />}
              className="border-soft bg-panel text-sm"
            >
              Import
            </Button>
            <Button
              radius="lg"
              color="primary"
              startContent={<Plus className="h-4 w-4" />}
              onPress={() => setCreateOpen(true)}
            >
              Add lead
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-3">
          <div className="flex flex-col gap-3 rounded-2xl border border-soft surface-panel p-2 shadow-soft sm:flex-row sm:items-center sm:gap-2">
            <Input
              aria-label="Search this view"
              radius="lg"
              variant="bordered"
              startContent={<Search className="h-4 w-4 text-ink-400" />}
              placeholder="Search this view…"
              value={filters.query ?? ""}
              onValueChange={(v) => setFilters((f) => ({ ...f, query: v }))}
              classNames={{
                inputWrapper: "border-soft bg-panel shadow-none data-[hover=true]:border-firm",
                input: "text-sm",
              }}
              className="flex-1"
            />
            <Tabs
              aria-label="Saved views"
              size="sm"
              radius="full"
              variant="solid"
              selectedKey={activeListId}
              onSelectionChange={(k) => setActiveListId(String(k))}
              classNames={{
                tabList: "bg-ink-100/70 p-1",
                tab: "text-xs font-medium px-3",
                cursor: "shadow-soft",
              }}
            >
              <Tab key="all" title="All" />
              <Tab key="new" title="New" />
              <Tab key="qualified" title="Qualified" />
              <Tab key="needs_followup" title="Follow up" />
              <Tab key="stale" title={`Stale${staleSet.size > 0 ? ` · ${staleSet.size}` : ""}`} />
              <Tab key="suppressed" title="Suppressed" />
              {snapshot.lists.map((l) => (
                <Tab key={l.id} title={l.name} />
              ))}
            </Tabs>
            <div className="flex items-center gap-1.5">
              <span className="hidden text-[11px] text-ink-500 sm:inline">Sort</span>
              <Tabs
                aria-label="Sort by"
                size="sm"
                radius="full"
                variant="light"
                selectedKey={sortKey}
                onSelectionChange={(k) => setSortKey(k as SortKey)}
                classNames={{
                  tabList: "p-0 gap-0",
                  tab: "text-xs px-2",
                  cursor: "bg-ink-100",
                }}
              >
                {SORT_OPTIONS.map((o) => (
                  <Tab key={o.key} title={o.label} />
                ))}
              </Tabs>
            </div>
            {hasSaveable && (
              <Button
                size="sm"
                variant="flat"
                radius="full"
                className="bg-primary-50 text-xs text-primary-700"
                startContent={<BookmarkPlus className="h-3.5 w-3.5" />}
                onPress={() => setSaveListOpen(true)}
              >
                Save as list
              </Button>
            )}
            <Tooltip
              content={viewMode === "board" ? "Switch to table view" : "Switch to board / kanban view"}
              placement="top"
            >
              <Button
                isIconOnly
                size="sm"
                radius="full"
                variant={viewMode === "board" ? "flat" : "light"}
                color={viewMode === "board" ? "primary" : "default"}
                aria-label="Toggle board view"
                className="hidden h-8 w-8 min-w-8 md:inline-flex"
                onPress={() => {
                  const next = viewMode === "board" ? "table" : "board";
                  setViewMode(next);
                  if (next === "board") setActiveListId("all");
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("perchlead.inbox_view", next);
                  }
                }}
              >
                <KanbanSquare className="h-4 w-4" />
              </Button>
            </Tooltip>
            {viewMode === "table" && (
              <Tooltip
                content={density === "comfortable" ? "Switch to compact rows" : "Switch to comfortable rows"}
                placement="top"
              >
                <Button
                  isIconOnly
                  size="sm"
                  radius="full"
                  variant="light"
                  aria-label="Toggle row density"
                  className="h-8 w-8 min-w-8"
                  onPress={() => {
                    const next: Density = density === "comfortable" ? "compact" : "comfortable";
                    setDensity(next);
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem("perchlead.inbox_density", next);
                    }
                  }}
                >
                  {density === "comfortable" ? <Rows3 className="h-4 w-4" /> : <Rows4 className="h-4 w-4" />}
                </Button>
              </Tooltip>
            )}
            {filteredRows.length > 0 && (
              <Button
                size="sm"
                variant="light"
                radius="full"
                className="text-xs"
                startContent={<Download className="h-3.5 w-3.5" />}
                onPress={() => {
                  downloadCsv(filteredRows);
                  toast.push({
                    tone: "success",
                    title: "Export started",
                    description: "Suppressed leads were excluded.",
                  });
                }}
              >
                Export view
              </Button>
            )}
          </div>

          {isEmpty && (
            <EmptyState
              icon={<Inbox className="h-5 w-5" />}
              title="Import your first messy lead list"
              description="Drop a CSV, paste rows from a sheet, or add a single lead by hand. Perchlead will clean, dedupe, and score them automatically."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button as={Link} href="/imports" color="primary" radius="lg" startContent={<Upload className="h-4 w-4" />}>
                    Import leads
                  </Button>
                  <Button
                    variant="bordered"
                    radius="lg"
                    className="border-soft bg-panel"
                    startContent={<Sparkles className="h-4 w-4" />}
                    onPress={() => setCreateOpen(true)}
                  >
                    Add by hand
                  </Button>
                </div>
              }
            />
          )}

          {filteredEmpty && (
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title="No leads match this view"
              description="Try clearing filters or switching to All."
              action={
                <Button
                  variant="light"
                  onPress={() => {
                    setFilters({});
                    setActiveListId("all");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          )}

          {!isEmpty && !filteredEmpty && (
            viewMode === "board" ? (
              <LeadBoard rows={filteredRows} />
            ) : (
              <LeadTable
                rows={filteredRows}
                selected={selected}
                onSelect={select}
                onRowClick={(row) => router.push(`/leads/${row.lead.id}`)}
                density={density}
              />
            )
          )}
        </div>

        {showFilters && (
          <div className="w-full lg:w-[280px] lg:shrink-0">
            <LeadFilterBar
              filters={filters}
              onChange={setFilters}
              tags={snapshot.tags}
              products={snapshot.products}
              sources={snapshot.sources}
            />
          </div>
        )}
      </div>

      <BulkActionsBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onSetStatus={onBulkStatus}
        onSuppress={onBulkSuppress}
        onExport={onBulkExport}
        onDelete={onBulkDelete}
        tags={snapshot.tags}
        products={snapshot.products}
        onToggleTag={onBulkTag}
        onSetInterest={onBulkInterest}
        exportPresets={EXPORT_PRESET_LIST.filter((p) => p.key !== "generic")}
        onPresetExport={onBulkPresetExport}
      />

      <LeadCreateModal open={createOpen} onOpenChange={setCreateOpen} />
      <ConfirmDialog
        open={confirmBulkDeleteOpen}
        title={`Delete ${selected.size} lead${selected.size === 1 ? "" : "s"}?`}
        description="This cannot be undone. All interactions and tasks for these leads will be removed."
        confirmLabel={`Delete ${selected.size === 1 ? "lead" : "leads"}`}
        isDangerous
        onConfirm={() => {
          selectedRows.forEach((r) => deleteLead(r.lead.id));
          setSelected(new Set());
          toast.push({ tone: "info", title: "Leads deleted." });
          setConfirmBulkDeleteOpen(false);
        }}
        onCancel={() => setConfirmBulkDeleteOpen(false)}
      />
      <SaveListModal
        open={saveListOpen}
        filters={filters}
        onOpenChange={setSaveListOpen}
        onSaved={(id) => {
          setActiveListId(id);
          toast.push({
            tone: "success",
            title: "List saved",
            description: "Available from the saved view tabs and from /lists.",
          });
        }}
      />
    </div>
  );
}
