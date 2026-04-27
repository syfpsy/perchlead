"use client";

import { useState } from "react";
import { Button, Input, Select, SelectItem } from "@heroui/react";
import { Compass, Globe, Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  mockLeadFinderProvider,
  type LeadFinderResult,
} from "@/lib/providers/lead-finder-provider";
import { createLead } from "@/lib/services/lead-service";
import { useToast } from "@/components/ui/toast";

const PROVIDERS = [
  { key: "mock-finder", label: "Mock (preview)" },
  { key: "google_places", label: "Google Places (planned)" },
  { key: "manual", label: "Manual web search (planned)" },
];

export default function FinderPage() {
  const toast = useToast();
  const [query, setQuery] = useState("animation studios in Berlin");
  const [niche, setNiche] = useState("animation");
  const [location, setLocation] = useState("Berlin");
  const [provider, setProvider] = useState("mock-finder");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LeadFinderResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function search() {
    setLoading(true);
    try {
      const out = await mockLeadFinderProvider.search({
        query,
        location,
        niche,
        limit: 8,
      });
      setResults(out);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }

  function saveSelected() {
    const picks = results.filter((r) => selected.has(r.id));
    if (!picks.length) return;
    let saved = 0;
    for (const pick of picks) {
      createLead({
        name: pick.name,
        email: pick.email,
        company_name: pick.company,
        website: pick.website,
        location: pick.location,
        notes: pick.description,
        consent_basis: "public_directory",
        source: { type: "lead_finder", name: `Lead Finder · ${query}` },
      });
      saved++;
    }
    toast.push({
      tone: "success",
      title: `Saved ${saved} lead${saved === 1 ? "" : "s"}`,
      description: "Added with `public_directory` consent. Verify before any outreach.",
    });
    setSelected(new Set());
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lead Finder"
        description="Sketch out new leads from a query. We ship a mock provider out of the box — wire up real ones in /lib/providers/lead-finder-provider.ts."
        actions={
          <Button
            color="primary"
            radius="lg"
            isDisabled={selected.size === 0}
            startContent={<Plus className="h-4 w-4" />}
            onPress={saveSelected}
          >
            Save selected ({selected.size})
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-soft surface-panel p-4 shadow-soft md:grid-cols-[2fr_1fr_1fr_auto]">
        <Input
          aria-label="Query"
          variant="bordered"
          radius="lg"
          startContent={<Search className="h-4 w-4 text-ink-400" />}
          value={query}
          onValueChange={setQuery}
          placeholder="animation studios in Berlin"
          classNames={{ inputWrapper: "border-soft bg-white shadow-none", input: "text-sm" }}
        />
        <Input
          aria-label="Location"
          variant="bordered"
          radius="lg"
          value={location}
          onValueChange={setLocation}
          placeholder="Location"
          classNames={{ inputWrapper: "border-soft bg-white shadow-none", input: "text-sm" }}
        />
        <Input
          aria-label="Niche"
          variant="bordered"
          radius="lg"
          value={niche}
          onValueChange={setNiche}
          placeholder="Niche"
          classNames={{ inputWrapper: "border-soft bg-white shadow-none", input: "text-sm" }}
        />
        <Button color="primary" radius="lg" onPress={search} isLoading={loading}>
          Search
        </Button>
      </section>

      <section className="flex items-center justify-between rounded-2xl border border-dashed border-firm bg-white/40 px-4 py-3 text-xs text-ink-500">
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-ink-400" />
          Provider:
          <Select
            aria-label="Provider"
            size="sm"
            selectedKeys={[provider]}
            onSelectionChange={(keys) => {
              const k = Array.from(keys)[0];
              if (k) setProvider(String(k));
            }}
            className="w-[220px]"
            variant="flat"
          >
            {PROVIDERS.map((p) => (
              <SelectItem key={p.key}>{p.label}</SelectItem>
            ))}
          </Select>
        </div>
        <span>Mock results are deterministic. No live scraping.</span>
      </section>

      {!results.length ? (
        <EmptyState
          icon={<Compass className="h-5 w-5" />}
          title="Search to surface results"
          description="Try queries like ‘animation studios in Berlin’, ‘restaurants in Ataşehir’, or ‘mobile game studios hiring motion designers’."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {results.map((r) => {
            const checked = selected.has(r.id);
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-soft surface-panel p-4 shadow-soft transition hover:border-primary-200"
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-3.5 w-3.5 rounded border-firm text-primary-600 focus:ring-primary-500"
                    checked={checked}
                    onChange={(e) => {
                      setSelected((cur) => {
                        const next = new Set(cur);
                        if (e.target.checked) next.add(r.id);
                        else next.delete(r.id);
                        return next;
                      });
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900">{r.name}</p>
                    <p className="text-xs text-ink-500">
                      {r.company} · {r.location ?? "—"} · {r.industry ?? ""}
                    </p>
                    {r.email && (
                      <p className="mt-1 text-xs text-primary-700">{r.email}</p>
                    )}
                    {r.description && (
                      <p className="mt-1 text-xs text-ink-600">{r.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(r.tags ?? []).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-700"
                        >
                          {t}
                        </span>
                      ))}
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                        {(r.confidence * 100).toFixed(0)}% match
                      </span>
                    </div>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[11px] text-ink-400">
        Compliance: results are added with <code className="rounded bg-ink-100 px-1 py-0.5">public_directory</code>{" "}
        consent. Always verify before contacting.
      </p>
    </div>
  );
}
