"use client";

import { Button } from "@heroui/react";
import { Sparkles, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import clsx from "clsx";
import type { ParsedTable } from "@/lib/services/import-service";
import { parseCsvText, parsePastedTable } from "@/lib/services/import-service";

const SAMPLE_CSV = `name,email,company,website,title,location,source,notes
Maya Pekar,maya@studiopekar.de,Studio Pekar,studiopekar.de,Founder,"Berlin, DE",Twitter,Mentioned AE templates
Daniel Aksoy,info@aksoylokantasi.com,Aksoy Lokantası,aksoylokantasi.com,Owner,"Ataşehir, IST",Directory,Restaurant
Elif Korkmaz,elif@pixelhousegames.com,Pixelhouse Games,pixelhousegames.com,Producer,"Istanbul, TR",AppSumo,Bought Q1 deal
Jonas Weiss,j@weiss-motion.com,Weiss Motion,weiss-motion.com,Animator,"Berlin, DE",Newsletter,
Aria Ng,aria@loopworks.io,Loopworks,loopworks.io,Founder,Singapore,Directory,Lottie shop
Mateo Rivera,mateo@rivera.studio,Rivera & Co,rivera.studio,Designer,"Madrid, ES",Manual,
`;

interface Props {
  onParsed: (table: ParsedTable, ctx: { filename: string; sourceType: "csv" | "paste" }) => void;
}

export function ImportUploader({ onParsed }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pasteValue, setPasteValue] = useState("");
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const table = parseCsvText(text);
      onParsed(table, { filename: file.name, sourceType: "csv" });
    };
    reader.readAsText(file);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={clsx(
          "flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition",
          dragOver ? "border-primary-400 bg-primary-50/40" : "border-firm bg-white/40",
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
          <UploadCloud className="h-5 w-5" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-ink-900">Upload a CSV</h3>
        <p className="mt-1 max-w-sm text-xs text-ink-500">
          Drag a CSV file here, or click to choose. Headers can be in any order — Perchlead will
          auto-map them.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Button
            size="sm"
            radius="lg"
            color="primary"
            onPress={() => fileInput.current?.click()}
            startContent={<UploadCloud className="h-4 w-4" />}
          >
            Choose file
          </Button>
          <Button
            size="sm"
            radius="lg"
            variant="bordered"
            className="border-soft bg-white"
            startContent={<Sparkles className="h-4 w-4" />}
            onPress={() => {
              const table = parseCsvText(SAMPLE_CSV);
              onParsed(table, { filename: "perchlead-sample.csv", sourceType: "csv" });
            }}
          >
            Use sample
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      <div className="flex flex-col rounded-3xl border border-soft surface-panel p-4 shadow-soft">
        <h3 className="text-sm font-semibold text-ink-900">Paste from a sheet</h3>
        <p className="mt-1 text-xs text-ink-500">
          Copy rows from Excel, Google Sheets, Numbers — including the header row.
        </p>
        <textarea
          value={pasteValue}
          onChange={(e) => setPasteValue(e.target.value)}
          rows={10}
          spellCheck={false}
          className="mt-3 flex-1 resize-y rounded-2xl border border-soft bg-white p-3 font-mono text-xs text-ink-800 outline-none focus:border-primary-400"
          placeholder={"name\temail\tcompany\nMaya\tmaya@…\tStudio Pekar"}
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button
            size="sm"
            variant="light"
            onPress={() => setPasteValue("")}
            isDisabled={!pasteValue}
          >
            Clear
          </Button>
          <Button
            size="sm"
            color="primary"
            isDisabled={!pasteValue.trim()}
            onPress={() => {
              const table = parsePastedTable(pasteValue);
              onParsed(table, { filename: "Pasted rows", sourceType: "paste" });
            }}
          >
            Preview rows
          </Button>
        </div>
      </div>
    </div>
  );
}
