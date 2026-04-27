"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import clsx from "clsx";

type ToastTone = "success" | "error" | "info";

interface ToastEntry {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  push: (entry: Omit<ToastEntry, "id"> & { id?: string }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const value = useMemo<ToastContextValue>(
    () => ({
      push: (entry) => {
        const id = entry.id ?? Math.random().toString(36).slice(2);
        setToasts((cur) => [...cur, { ...entry, id }]);
      },
    }),
    [],
  );

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) =>
      setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== t.id)), 4200),
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={clsx(
              "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border bg-white px-4 py-3 shadow-pop animate-fade-in",
              t.tone === "success" && "border-emerald-200",
              t.tone === "error" && "border-red-200",
              t.tone === "info" && "border-ink-200",
            )}
          >
            <div className="mt-0.5">
              {t.tone === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              {t.tone === "error" && <AlertTriangle className="h-4 w-4 text-red-600" />}
              {t.tone === "info" && <Info className="h-4 w-4 text-primary" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-ink-900">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs text-ink-500">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}
              className="rounded-full p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
