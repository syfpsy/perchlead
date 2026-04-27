"use client";

import { Button, Chip } from "@heroui/react";
import { Filter, X } from "lucide-react";
import clsx from "clsx";
import type { LeadFilters, LeadStatus, Product, Source, Tag } from "@/types";
import { ALL_STATUSES, statusLabel } from "@/components/ui/status-chip";

interface Props {
  filters: LeadFilters;
  onChange: (next: LeadFilters) => void;
  tags: Tag[];
  products: Product[];
  sources: Source[];
  className?: string;
}

export function LeadFilterBar({ filters, onChange, tags, products, sources, className }: Props) {
  const toggleStatus = (s: LeadStatus) => {
    const cur = filters.statuses ?? [];
    onChange({
      ...filters,
      statuses: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    });
  };
  const toggleTag = (id: string) => {
    const cur = filters.tag_ids ?? [];
    onChange({
      ...filters,
      tag_ids: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    });
  };
  const toggleProduct = (id: string) => {
    const cur = filters.product_ids ?? [];
    onChange({
      ...filters,
      product_ids: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    });
  };
  const toggleSource = (type: Source["type"]) => {
    const cur = filters.source_types ?? [];
    onChange({
      ...filters,
      source_types: cur.includes(type) ? cur.filter((x) => x !== type) : [...cur, type],
    });
  };

  const hasAny =
    (filters.statuses?.length ?? 0) +
      (filters.tag_ids?.length ?? 0) +
      (filters.product_ids?.length ?? 0) +
      (filters.source_types?.length ?? 0) >
      0 ||
    typeof filters.score_min === "number" ||
    typeof filters.is_suppressed === "boolean";

  const sourceTypes = Array.from(new Set(sources.map((s) => s.type)));

  return (
    <div className={clsx("space-y-3 rounded-2xl border border-soft surface-panel p-3 shadow-soft", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-ink-700">
          <Filter className="h-3.5 w-3.5 text-ink-400" /> Filters
        </div>
        {hasAny && (
          <Button
            variant="light"
            size="sm"
            radius="full"
            className="text-xs"
            onPress={() => onChange({})}
            startContent={<X className="h-3 w-3" />}
          >
            Clear
          </Button>
        )}
      </div>
      <FilterRow label="Status">
        {ALL_STATUSES.map((status) => {
          const active = filters.statuses?.includes(status);
          return (
            <FilterChip key={status} active={!!active} onClick={() => toggleStatus(status)}>
              {statusLabel(status)}
            </FilterChip>
          );
        })}
      </FilterRow>
      {tags.length > 0 && (
        <FilterRow label="Tags">
          {tags.map((tag) => {
            const active = filters.tag_ids?.includes(tag.id);
            return (
              <FilterChip key={tag.id} active={!!active} onClick={() => toggleTag(tag.id)}>
                <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </FilterChip>
            );
          })}
        </FilterRow>
      )}
      {products.length > 0 && (
        <FilterRow label="Product interest">
          {products.map((p) => {
            const active = filters.product_ids?.includes(p.id);
            return (
              <FilterChip key={p.id} active={!!active} onClick={() => toggleProduct(p.id)}>
                {p.name}
              </FilterChip>
            );
          })}
        </FilterRow>
      )}
      {sourceTypes.length > 0 && (
        <FilterRow label="Source">
          {sourceTypes.map((t) => {
            const active = filters.source_types?.includes(t);
            return (
              <FilterChip key={t} active={!!active} onClick={() => toggleSource(t)}>
                {t.replaceAll("_", " ")}
              </FilterChip>
            );
          })}
        </FilterRow>
      )}
      <FilterRow label="Score">
        {[
          { label: "Any", min: undefined },
          { label: "70+", min: 70 },
          { label: "50+", min: 50 },
          { label: "30+", min: 30 },
        ].map((opt) => {
          const active = (filters.score_min ?? -1) === (opt.min ?? -1);
          return (
            <FilterChip
              key={opt.label}
              active={active}
              onClick={() => onChange({ ...filters, score_min: opt.min })}
            >
              {opt.label}
            </FilterChip>
          );
        })}
      </FilterRow>
      <FilterRow label="Compliance">
        {[
          { label: "Hide suppressed", v: false },
          { label: "Only suppressed", v: true },
          { label: "All", v: undefined },
        ].map((opt) => {
          const active = filters.is_suppressed === opt.v;
          return (
            <FilterChip
              key={opt.label}
              active={active}
              onClick={() => onChange({ ...filters, is_suppressed: opt.v })}
            >
              {opt.label}
            </FilterChip>
          );
        })}
      </FilterRow>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Chip
      as="button"
      onClick={onClick}
      size="sm"
      variant={active ? "solid" : "flat"}
      classNames={{
        base: clsx(
          "cursor-pointer px-2.5 py-1 text-xs capitalize transition",
          active
            ? "bg-primary-600 text-white shadow-soft"
            : "bg-ink-100/70 text-ink-700 hover:bg-ink-200",
        ),
      }}
    >
      {children}
    </Chip>
  );
}
