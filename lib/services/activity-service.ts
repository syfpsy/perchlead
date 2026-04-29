// Activity feed: a UI-friendly view of audit_logs joined with the entity it
// references. Pure functions over a snapshot — same shape as the rest of the
// services so a Neon swap is a one-file change.

import type { AuditLog, DataSnapshot } from "@/types";

export interface ActivityRow {
  log: AuditLog;
  /** Human label for the entity, e.g. "Maya Pekar" or "AppSumo Buyers Q1.csv". */
  entityLabel: string;
  /** Optional in-app link to the entity. */
  entityHref?: string;
  /** Short verb, e.g. "imported", "marked as Do Not Contact". */
  verb: string;
  /** Optional supporting detail to render under the verb. */
  detail?: string;
  /** A `tone` we can paint the icon dot with. */
  tone: "neutral" | "primary" | "success" | "warning" | "danger";
}

const ACTION_VERBS: Record<AuditLog["action"], string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
  merge: "merged",
  import: "imported",
  export: "exported",
  suppress: "suppressed",
  unsuppress: "removed from suppression",
  score: "rescored",
};

const ACTION_TONE: Record<AuditLog["action"], ActivityRow["tone"]> = {
  create: "primary",
  update: "neutral",
  delete: "danger",
  merge: "primary",
  import: "primary",
  export: "success",
  suppress: "danger",
  unsuppress: "success",
  score: "neutral",
};

export function buildActivityRows(snapshot: DataSnapshot): ActivityRow[] {
  const leadById = new Map(snapshot.leads.map((l) => [l.id, l]));
  const importById = new Map(snapshot.imports.map((i) => [i.id, i]));
  const productById = new Map(snapshot.products.map((p) => [p.id, p]));
  const tagById = new Map(snapshot.tags.map((t) => [t.id, t]));

  return snapshot.audit_logs
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map<ActivityRow>((log) => {
      let entityLabel = log.entity_id;
      let entityHref: string | undefined;
      let detail: string | undefined;

      if (log.entity_type === "lead") {
        const lead = leadById.get(log.entity_id);
        entityLabel = lead?.name ?? `Lead ${log.entity_id.slice(0, 6)}`;
        entityHref = lead ? `/leads/${lead.id}` : undefined;
        if (log.action === "merge" && log.metadata_json?.mergedFromName) {
          detail = `Merged in "${String(log.metadata_json.mergedFromName)}"`;
        } else if (log.action === "suppress" && log.metadata_json?.reason) {
          detail = String(log.metadata_json.reason);
        } else if (log.action === "import") {
          const importId = log.metadata_json?.import_id as string | undefined;
          const imp = importId ? importById.get(importId) : undefined;
          if (imp) detail = `From ${imp.filename}`;
        } else if (log.action === "update" && log.metadata_json) {
          const fields = Object.keys(log.metadata_json).filter((k) => k !== "updated_at");
          if (fields.length) detail = `Changed ${fields.slice(0, 3).join(", ")}${fields.length > 3 ? "…" : ""}`;
        }
      } else if (log.entity_type === "import") {
        const imp = importById.get(log.entity_id);
        entityLabel = imp?.filename ?? `Import ${log.entity_id.slice(0, 6)}`;
        entityHref = "/imports";
        if (log.action === "import" && log.metadata_json) {
          const m = log.metadata_json as Record<string, number>;
          detail = `${m.imported ?? 0} imported · ${m.duplicates ?? 0} duplicates · ${m.errors ?? 0} errors`;
        }
      } else if (log.entity_type === "list") {
        // export action uses the filename as entity_id today
        entityLabel = log.entity_id;
        if (log.action === "export" && log.metadata_json) {
          const m = log.metadata_json as Record<string, unknown>;
          detail = `${String(m.count ?? "?")} rows · ${m.included_suppressed ? "incl. suppressed" : "suppressed excluded"}`;
        }
      } else if (log.entity_type === "product") {
        const p = productById.get(log.entity_id);
        entityLabel = p?.name ?? `Product ${log.entity_id.slice(0, 6)}`;
      } else if (log.entity_type === "tag") {
        const t = tagById.get(log.entity_id);
        entityLabel = t?.name ?? `Tag ${log.entity_id.slice(0, 6)}`;
      } else if (log.entity_type === "task") {
        const lead =
          log.metadata_json?.lead_id && typeof log.metadata_json.lead_id === "string"
            ? leadById.get(log.metadata_json.lead_id)
            : undefined;
        entityLabel = (log.metadata_json?.title as string) ?? `Task ${log.entity_id.slice(0, 6)}`;
        if (lead) {
          entityHref = `/leads/${lead.id}`;
          detail = `On ${lead.name}`;
        }
        if (log.action === "update" && log.metadata_json?.status) {
          detail = [detail, `→ ${String(log.metadata_json.status)}`].filter(Boolean).join(" · ");
        }
      }

      return {
        log,
        entityLabel,
        entityHref,
        verb: ACTION_VERBS[log.action],
        detail,
        tone: ACTION_TONE[log.action],
      };
    });
}

export function activityForLead(rows: ActivityRow[], leadId: string): ActivityRow[] {
  return rows.filter((r) => {
    if (r.log.entity_type === "lead" && r.log.entity_id === leadId) return true;
    if (r.log.entity_type === "task" && r.log.metadata_json?.lead_id === leadId) return true;
    return false;
  });
}

export type ActivityFilter = {
  entity_types?: AuditLog["entity_type"][];
  actions?: AuditLog["action"][];
  query?: string;
};

export function filterActivity(rows: ActivityRow[], filter: ActivityFilter): ActivityRow[] {
  const q = filter.query?.trim().toLowerCase() ?? "";
  return rows.filter((r) => {
    if (filter.entity_types?.length && !filter.entity_types.includes(r.log.entity_type)) return false;
    if (filter.actions?.length && !filter.actions.includes(r.log.action)) return false;
    if (q) {
      const hay = `${r.entityLabel} ${r.verb} ${r.detail ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
