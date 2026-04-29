"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Select, SelectItem, Switch } from "@/lib/heroui-compat";
import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles, Upload } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ImportUploader } from "@/components/imports/import-uploader";
import { ColumnMapper } from "@/components/imports/column-mapper";
import { PreviewTable } from "@/components/imports/preview-table";
import { useToast } from "@/components/ui/toast";
import { useSnapshot } from "@/lib/store/use-snapshot";
import {
  autoMapColumns,
  commitImport,
  importableSources,
  inferSourceType,
  previewImport,
  type ParsedTable,
  type SourceTypeGuess,
} from "@/lib/services/import-service";
import type { ColumnMapping, ConsentBasis, SourceType } from "@/types";
import { formatRelative } from "@/lib/utils/format";

type Step = "source" | "upload" | "map" | "review" | "done";

const CONSENT_OPTIONS: Array<{ key: ConsentBasis; label: string }> = [
  { key: "purchase", label: "Purchase / customer" },
  { key: "newsletter_signup", label: "Newsletter signup" },
  { key: "form_submission", label: "Form submission" },
  { key: "manual_entry", label: "Manual entry" },
  { key: "public_directory", label: "Public directory" },
  { key: "user_provided", label: "User provided" },
  { key: "unknown", label: "Unknown" },
];

export default function ImportsPage() {
  const snapshot = useSnapshot();
  const toast = useToast();

  const [step, setStep] = useState<Step>("source");
  const [sourceType, setSourceType] = useState<SourceType>("csv");
  const [sourceGuess, setSourceGuess] = useState<SourceTypeGuess | null>(null);
  const [parsed, setParsed] = useState<ParsedTable | null>(null);
  const [filename, setFilename] = useState("");
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [consent, setConsent] = useState<ConsentBasis>("manual_entry");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    duplicates: number;
    errors: number;
  } | null>(null);

  const preview = useMemo(() => {
    if (!parsed) return [];
    return previewImport({ rows: parsed.rows, mapping });
  }, [parsed, mapping]);

  const stats = useMemo(() => {
    let dupe = 0;
    let err = 0;
    let supp = 0;
    let ok = 0;
    for (const row of preview) {
      if (row.errors.length) err++;
      else if (row.willSuppress) supp++;
      else if (row.duplicates[0] && row.duplicates[0].confidence >= 0.85) dupe++;
      else ok++;
    }
    return { dupe, err, supp, ok };
  }, [preview]);

  const recentImports = snapshot.imports
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  function handleParsed(
    table: ParsedTable,
    ctx: { filename: string; sourceType: "csv" | "paste" },
  ) {
    setParsed(table);
    setFilename(ctx.filename);
    const guess = inferSourceType(table);
    setSourceGuess(guess);
    // If we have a confident guess and the file is a CSV, prefer the guessed
    // source type (e.g. gumroad) so audit logs and downstream filters get the
    // right metadata. Paste imports keep `paste`.
    setSourceType(ctx.sourceType === "paste" ? "paste" : guess.confidence >= 0.5 ? guess.type : "csv");
    setMapping(autoMapColumns(table.headers));
    setStep("map");
  }

  function commit() {
    if (!parsed || !preview.length) return;
    setCommitting(true);
    Promise.resolve().then(() => {
      const res = commitImport({
        filename: filename || "Untitled import",
        source_type: sourceType,
        consent_basis: consent,
        mapping,
        preview,
        skipDuplicates,
      });
      setResult({
        imported: res.imported,
        duplicates: res.duplicates,
        errors: res.errors,
      });
      setStep("done");
      setCommitting(false);
      toast.push({
        tone: "success",
        title: `Imported ${res.imported} lead${res.imported === 1 ? "" : "s"}`,
        description: `${res.duplicates} duplicates skipped · ${res.errors} errors`,
      });
    });
  }

  function reset() {
    setParsed(null);
    setFilename("");
    setMapping({});
    setResult(null);
    setSourceGuess(null);
    setSourceType("csv");
    setStep("source");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Import Center"
        description="CSV, paste, or webhook. Perchlead auto-maps columns, normalizes fields, finds duplicates, and writes a clean import record."
        actions={
          step !== "source" && (
            <Button
              variant="bordered"
              radius="lg"
              className="border-soft bg-panel"
              startContent={<ChevronLeft className="h-4 w-4" />}
              onPress={reset}
            >
              Start over
            </Button>
          )
        }
      />

      <Stepper step={step} />

      {step === "source" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <ImportUploader onParsed={handleParsed} />
            <SourceCatalog
              onPick={(type) => {
                if (type === "csv" || type === "paste") {
                  toast.push({
                    tone: "info",
                    title: "Pick a file or paste a table to continue.",
                  });
                  return;
                }
                if (type === "manual") {
                  window.location.href = "/leads?new=1";
                  return;
                }
                toast.push({
                  tone: "info",
                  title: `${type.replaceAll("_", " ")} integration coming soon`,
                  description: "We've staged a provider hook in /lib/providers.",
                });
              }}
            />
          </div>
          <RecentImportsCard recent={recentImports} />
        </div>
      )}

      {step === "map" && parsed && (
        <div className="space-y-4">
          {sourceGuess && sourceGuess.confidence >= 0.5 && (
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-primary-200 bg-primary-50/50 px-4 py-3 shadow-soft">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    Detected source: {sourceGuess.label}
                  </p>
                  <p className="text-xs text-ink-600">
                    {sourceGuess.signals.slice(0, 2).join(" · ")} ·{" "}
                    {(sourceGuess.confidence * 100).toFixed(0)}% confidence
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                radius="full"
                variant="light"
                className="text-xs"
                onPress={() => setSourceType(sourceType === sourceGuess.type ? "csv" : sourceGuess.type)}
              >
                {sourceType === sourceGuess.type ? "Use generic CSV instead" : `Use ${sourceGuess.label}`}
              </Button>
            </div>
          )}
          <PreviewSummary
            ok={stats.ok}
            dupe={stats.dupe}
            err={stats.err}
            supp={stats.supp}
            filename={filename}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-soft surface-panel p-4 shadow-soft">
              <h3 className="text-sm font-semibold text-ink-900">Map your columns</h3>
              <p className="mt-1 text-xs text-ink-500">
                Auto-mapped from common aliases. Adjust anything that's wrong, then continue.
              </p>
              <div className="mt-3">
                <ColumnMapper headers={parsed.headers} mapping={mapping} onChange={setMapping} />
              </div>
            </section>
            <section className="space-y-3 rounded-2xl border border-soft surface-panel p-4 shadow-soft">
              <h3 className="text-sm font-semibold text-ink-900">Preview</h3>
              <p className="text-xs text-ink-500">First {preview.length} rows after normalization.</p>
              <PreviewTable rows={preview.slice(0, 50)} />
              {preview.length > 50 && (
                <p className="text-[11px] text-ink-400">
                  Showing 50 of {preview.length} rows.
                </p>
              )}
            </section>
          </div>
          <div className="flex justify-end">
            <Button
              color="primary"
              radius="lg"
              endContent={<ChevronRight className="h-4 w-4" />}
              onPress={() => setStep("review")}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === "review" && parsed && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <PreviewSummary
              ok={stats.ok}
              dupe={stats.dupe}
              err={stats.err}
              supp={stats.supp}
              filename={filename}
            />
            <PreviewTable rows={preview} />
          </div>
          <aside className="space-y-3 rounded-2xl border border-soft surface-panel p-4 shadow-soft">
            <h3 className="text-sm font-semibold text-ink-900">Final review</h3>
            <Select
              label="Consent / legal basis"
              selectedKeys={[consent]}
              onSelectionChange={(keys) => {
                const k = Array.from(keys as Iterable<React.Key>)[0] as ConsentBasis | undefined;
                if (k) setConsent(k);
              }}
              size="sm"
            >
              {CONSENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.key}>{opt.label}</SelectItem>
              ))}
            </Select>
            <div className="flex items-center justify-between rounded-xl border border-soft bg-panel px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-ink-800">Skip likely duplicates</p>
                <p className="text-[11px] text-ink-500">
                  Rows with ≥ 90% confidence won't create a new lead.
                </p>
              </div>
              <Switch isSelected={skipDuplicates} onValueChange={setSkipDuplicates} />
            </div>
            <p className="text-[11px] text-ink-500">
              Suppressed emails or domains will be imported as Do Not Contact (score 0).
            </p>
            <Button
              color="primary"
              radius="lg"
              fullWidth
              onPress={commit}
              isLoading={committing}
              startContent={<Upload className="h-4 w-4" />}
            >
              Import {stats.ok + (skipDuplicates ? 0 : stats.dupe) + stats.supp} leads
            </Button>
            <Button
              variant="light"
              radius="lg"
              fullWidth
              onPress={() => setStep("map")}
            >
              Back to mapping
            </Button>
          </aside>
        </div>
      )}

      {step === "done" && result && (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5" />}
          title={`Imported ${result.imported} lead${result.imported === 1 ? "" : "s"}`}
          description={`${result.duplicates} duplicates skipped · ${result.errors} errors. Audit log was updated.`}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button as={Link} href="/leads" color="primary" radius="lg">
                Go to Inbox
              </Button>
              <Button variant="bordered" radius="lg" className="border-soft bg-panel" onPress={reset}>
                Import another
              </Button>
            </div>
          }
        />
      )}

      {step === "source" && parsed === null && snapshot.imports.length === 0 && (
        <p className="text-center text-xs text-ink-400">
          Tip: try the "Use sample" button to see a clean import from end to end.
        </p>
      )}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const order: Step[] = ["source", "map", "review", "done"];
  const labels: Record<Step, string> = {
    source: "Source",
    upload: "Upload",
    map: "Map",
    review: "Review",
    done: "Done",
  };
  const idx = order.indexOf(step);
  return (
    <ol className="flex items-center gap-2 text-xs">
      {order.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={[
              "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold",
              i < idx
                ? "bg-emerald-100 text-emerald-700"
                : i === idx
                  ? "bg-primary-600 text-white"
                  : "bg-ink-100 text-ink-500",
            ].join(" ")}
          >
            {i + 1}
          </span>
          <span
            className={[
              "font-medium",
              i === idx ? "text-ink-900" : "text-ink-500",
            ].join(" ")}
          >
            {labels[s]}
          </span>
          {i < order.length - 1 && <span className="text-ink-300">→</span>}
        </li>
      ))}
    </ol>
  );
}

function PreviewSummary({
  ok,
  dupe,
  err,
  supp,
  filename,
}: {
  ok: number;
  dupe: number;
  err: number;
  supp: number;
  filename: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-soft surface-panel p-4 text-sm shadow-soft md:grid-cols-4">
      <Stat label="Ready to import" value={ok} tone="emerald" />
      <Stat label="Possible duplicates" value={dupe} tone="amber" />
      <Stat label="Will suppress" value={supp} tone="red" />
      <Stat label="Errors" value={err} tone="zinc" hint={filename} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "red" | "zinc";
  hint?: string;
}) {
  const palette = {
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
    zinc: "text-ink-700",
  } as const;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${palette[tone]}`}>{value}</p>
      {hint && <p className="truncate text-[11px] text-ink-400">{hint}</p>}
    </div>
  );
}

function SourceCatalog({ onPick }: { onPick: (type: SourceType) => void }) {
  return (
    <section className="rounded-2xl border border-soft surface-panel p-4 shadow-soft">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">More sources</h3>
          <p className="text-xs text-ink-500">
            Provider hooks live in <code className="rounded bg-ink-100 px-1 py-0.5 text-[10px]">/lib/providers</code>.
          </p>
        </div>
        <Sparkles className="h-4 w-4 text-primary-500" />
      </header>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
        {importableSources.map((src) => (
          <button
            key={src.type}
            type="button"
            onClick={() => onPick(src.type)}
            className="rounded-2xl border border-soft bg-panel px-3 py-2 text-left text-xs text-ink-600 transition hover:border-primary-200 hover:bg-primary-50/50"
          >
            <p className="font-semibold text-ink-800">{src.label}</p>
            <p className="mt-0.5 text-[11px] text-ink-500">{src.helper}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function RecentImportsCard({ recent }: { recent: ReturnType<typeof useSnapshot>["imports"] }) {
  return (
    <aside className="space-y-3 rounded-2xl border border-soft surface-panel p-4 shadow-soft">
      <h3 className="text-sm font-semibold text-ink-900">Recent imports</h3>
      {recent.length === 0 ? (
        <p className="text-xs text-ink-500">No imports yet.</p>
      ) : (
        <ul className="space-y-2">
          {recent.map((imp) => (
            <li
              key={imp.id}
              className="rounded-xl border border-soft bg-panel px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <p className="truncate font-medium text-ink-800">{imp.filename}</p>
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-600">
                  {imp.source_type.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-ink-500">
                {imp.imported_count} imported · {imp.duplicate_count} dupes ·{" "}
                {imp.error_count} errors · {formatRelative(imp.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-ink-400">
        Every import writes a row to <code className="rounded bg-ink-100 px-1 py-0.5">audit_logs</code>.
      </p>
    </aside>
  );
}
