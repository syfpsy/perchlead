"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react";
import { Copy, Database, FileText, Pencil, Plus, RefreshCw, ShieldOff, Tags as TagsIcon, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSnapshot } from "@/lib/store/use-snapshot";
import { store } from "@/lib/store/data-store";
import { nid, nowIso } from "@/lib/utils/id";
import { useToast } from "@/components/ui/toast";
import { buildSuppression } from "@/lib/services/compliance-service";
import { TEMPLATES } from "@/lib/services/email-template-service";
import type { EmailTemplate } from "@/types";
import { extractDomain } from "@/lib/utils/string";
import { formatRelative } from "@/lib/utils/format";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Products you sell, sources you trust, and the compliance lists that keep outreach safe."
      />
      <Tabs
        aria-label="Settings tabs"
        radius="lg"
        variant="solid"
        classNames={{
          tabList: "bg-ink-100/70 p-1",
          tab: "text-sm font-medium px-4",
          cursor: "shadow-soft",
        }}
      >
        <Tab key="products" title="Products">
          <ProductsPanel />
        </Tab>
        <Tab key="tags" title="Tags">
          <TagsPanel />
        </Tab>
        <Tab key="sources" title="Sources">
          <SourcesPanel />
        </Tab>
        <Tab key="compliance" title="Compliance">
          <CompliancePanel />
        </Tab>
        <Tab key="templates" title="Templates">
          <TemplatesPanel />
        </Tab>
        <Tab key="data" title="Data & Neon">
          <DataPanel />
        </Tab>
      </Tabs>
    </div>
  );
}

function ProductsPanel() {
  const snapshot = useSnapshot();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  function save() {
    if (!name.trim()) return;
    store.update((s) => {
      s.products.push({
        id: nid("prod"),
        owner_id: s.current_user.id,
        name: name.trim(),
        url: url.trim() || null,
        description: description.trim() || null,
        created_at: nowIso(),
        updated_at: nowIso(),
      });
    });
    setName("");
    setUrl("");
    setDescription("");
    setOpen(false);
    toast.push({ tone: "success", title: "Product added" });
  }

  function remove(id: string) {
    store.update((s) => {
      s.products = s.products.filter((p) => p.id !== id);
      s.product_interests = s.product_interests.filter((p) => p.product_id !== id);
    });
    toast.push({ tone: "info", title: "Product removed" });
  }

  return (
    <Section
      title="Products you sell"
      description="Each lead can be tagged with multiple products and an interest level. Use this to manage multi-product portfolios."
      action={
        <Button color="primary" radius="lg" onPress={() => setOpen(true)} startContent={<Plus className="h-4 w-4" />}>
          Add product
        </Button>
      }
    >
      <ul className="space-y-2">
        {snapshot.products.map((p) => (
          <li key={p.id} className="flex items-start justify-between gap-3 rounded-xl border border-soft bg-white px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900">{p.name}</p>
              {p.description && <p className="text-xs text-ink-500">{p.description}</p>}
              {p.url && (
                <a href={p.url} target="_blank" rel="noreferrer" className="text-[11px] text-primary-700 hover:underline">
                  {p.url}
                </a>
              )}
            </div>
            <button
              onClick={() => setConfirmRemoveId(p.id)}
              className="rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-red-600"
              aria-label="Remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {snapshot.products.length === 0 && (
          <li className="rounded-xl border border-dashed border-firm bg-white/50 px-3 py-3 text-center text-xs text-ink-500">
            No products yet.
          </li>
        )}
      </ul>

      <ConfirmDialog
        open={confirmRemoveId !== null}
        title="Remove this product?"
        description="Interest data linked to this product will also be removed."
        confirmLabel="Remove"
        isDangerous
        onConfirm={() => {
          if (confirmRemoveId) remove(confirmRemoveId);
          setConfirmRemoveId(null);
        }}
        onCancel={() => setConfirmRemoveId(null)}
      />
      <Modal isOpen={open} onOpenChange={setOpen} size="md" placement="center">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-ink-900">Add a product</h3>
            <p className="text-xs text-ink-500">Used in scoring and on the lead profile.</p>
          </ModalHeader>
          <ModalBody className="space-y-3">
            <Input label="Name" value={name} onValueChange={setName} isRequired />
            <Input label="URL" placeholder="https://" value={url} onValueChange={setUrl} />
            <Textarea label="Description" value={description} onValueChange={setDescription} minRows={2} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={save}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Section>
  );
}

function TagsPanel() {
  const snapshot = useSnapshot();
  const toast = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3a6bff");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  function add() {
    if (!name.trim()) return;
    store.update((s) => {
      s.tags.push({
        id: nid("tag"),
        owner_id: s.current_user.id,
        name: name.trim(),
        color,
        created_at: nowIso(),
      });
    });
    setName("");
    toast.push({ tone: "success", title: "Tag added" });
  }

  function remove(id: string) {
    store.update((s) => {
      s.tags = s.tags.filter((t) => t.id !== id);
      s.leads = s.leads.map((l) => ({ ...l, tag_ids: l.tag_ids.filter((tid) => tid !== id) }));
    });
    toast.push({ tone: "info", title: "Tag removed" });
  }

  return (
    <Section
      title="Tags"
      description="Lightweight labels on leads. Use them for cohorts, regions, sales-funnel hints — anything."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={name}
          onValueChange={setName}
          placeholder="Tag name"
          radius="lg"
          variant="bordered"
          className="w-48"
          classNames={{ inputWrapper: "border-soft bg-white shadow-none", input: "text-sm" }}
          startContent={<TagsIcon className="h-4 w-4 text-ink-400" />}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded-full border border-soft"
          aria-label="Tag color"
        />
        <Button color="primary" onPress={add} isDisabled={!name.trim()}>
          Add
        </Button>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {snapshot.tags.map((t) => (
          <li key={t.id} className="group inline-flex items-center gap-2 rounded-full bg-ink-100 px-2 py-1 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
            {t.name}
            <button
              className="text-ink-400 opacity-0 transition group-hover:opacity-100 hover:text-red-600"
              onClick={() => setConfirmRemoveId(t.id)}
              aria-label={`Remove ${t.name}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={confirmRemoveId !== null}
        title="Remove this tag?"
        description="The tag will be removed from all leads."
        confirmLabel="Remove"
        isDangerous
        onConfirm={() => {
          if (confirmRemoveId) remove(confirmRemoveId);
          setConfirmRemoveId(null);
        }}
        onCancel={() => setConfirmRemoveId(null)}
      />
    </Section>
  );
}

function SourcesPanel() {
  const snapshot = useSnapshot();
  const grouped = new Map<string, number>();
  for (const s of snapshot.sources) grouped.set(s.type, (grouped.get(s.type) ?? 0) + 1);

  return (
    <Section
      title="Sources"
      description="Every lead carries a source. Quality of the source is part of the score."
    >
      <ul className="space-y-2">
        {snapshot.sources
          .slice()
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-xl border border-soft bg-white px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-ink-900">{s.name}</p>
                <p className="text-[11px] text-ink-500 capitalize">
                  {s.type.replaceAll("_", " ")} · imported {formatRelative(s.imported_at)}
                </p>
              </div>
              <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-700">
                {(s.confidence * 100).toFixed(0)}%
              </span>
            </li>
          ))}
      </ul>
    </Section>
  );
}

function CompliancePanel() {
  const snapshot = useSnapshot();
  const toast = useToast();
  const [emailOrDomain, setEmailOrDomain] = useState("");
  const [reason, setReason] = useState("");

  function add() {
    const value = emailOrDomain.trim().toLowerCase();
    if (!value) return;
    const isEmail = value.includes("@");
    const sup = buildSuppression({
      ownerId: snapshot.current_user.id,
      email: isEmail ? value : null,
      domain: isEmail ? extractDomain(value) : value,
      reason: reason.trim() || null,
    });
    store.update((s) => {
      s.suppressions.push(sup);
      // Auto-suppress matching leads.
      s.leads = s.leads.map((l) => {
        const leadEmail = (l.email ?? "").toLowerCase();
        const leadDomain = extractDomain(l.website ?? l.email ?? "");
        const matched =
          (sup.email && leadEmail === sup.email) ||
          (sup.domain && leadDomain && leadDomain === sup.domain);
        return matched ? { ...l, is_suppressed: true, status: "do_not_contact" } : l;
      });
    });
    setEmailOrDomain("");
    setReason("");
    toast.push({ tone: "info", title: "Added to suppression list" });
  }

  function remove(id: string) {
    store.update((s) => {
      s.suppressions = s.suppressions.filter((x) => x.id !== id);
    });
    toast.push({ tone: "info", title: "Removed from suppression list" });
  }

  return (
    <Section
      title="Suppression / Do Not Contact"
      description="Add emails or domains that should never be exported for outreach. Leads matching these get score 0 and a Do Not Contact status."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={emailOrDomain}
          onValueChange={setEmailOrDomain}
          placeholder="email@example.com or example.com"
          radius="lg"
          variant="bordered"
          className="w-72"
          classNames={{ inputWrapper: "border-soft bg-white shadow-none", input: "text-sm" }}
          startContent={<ShieldOff className="h-4 w-4 text-ink-400" />}
        />
        <Input
          value={reason}
          onValueChange={setReason}
          placeholder="Reason (optional)"
          radius="lg"
          variant="bordered"
          className="w-72"
          classNames={{ inputWrapper: "border-soft bg-white shadow-none", input: "text-sm" }}
        />
        <Button color="primary" onPress={add} isDisabled={!emailOrDomain.trim()}>
          Add
        </Button>
      </div>

      <ul className="mt-3 space-y-2">
        {snapshot.suppressions.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between rounded-xl border border-soft bg-white px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-ink-900">{s.email ?? s.domain}</p>
              <p className="text-[11px] text-ink-500">{s.reason ?? "No reason recorded"}</p>
            </div>
            <button
              onClick={() => remove(s.id)}
              aria-label="Remove from suppression"
              className="rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {snapshot.suppressions.length === 0 && (
          <li className="rounded-xl border border-dashed border-firm bg-white/50 px-3 py-3 text-center text-xs text-ink-500">
            Nothing on the suppression list yet.
          </li>
        )}
      </ul>
    </Section>
  );
}

// ── Shared input classNames used in the template form modal ────────────────
const tmplFieldCn = {
  inputWrapper: "border-soft bg-white shadow-none data-[hover=true]:border-firm",
  input: "text-sm text-ink-900",
} as const;

function TemplatesPanel() {
  const snapshot = useSnapshot();
  const toast = useToast();
  // null = closed, {} = create new, EmailTemplate = edit existing
  const [editing, setEditing] = useState<Partial<EmailTemplate> | null>(null);

  const customTemplates = snapshot.email_templates ?? [];

  function save(data: {
    label: string;
    description: string;
    subject: string;
    body: string;
  }) {
    const now = nowIso();
    if (editing?.id && customTemplates.some((t) => t.id === editing.id)) {
      // Update an existing custom template.
      store.update((s) => {
        s.email_templates = (s.email_templates ?? []).map((t) =>
          t.id === editing.id ? { ...t, ...data, updated_at: now } : t,
        );
      });
      toast.push({ tone: "success", title: "Template updated" });
    } else {
      // Create new (or save a clone of a built-in).
      store.update((s) => {
        if (!s.email_templates) s.email_templates = [];
        s.email_templates.push({
          id: nid("tpl"),
          ...data,
          created_at: now,
          updated_at: now,
        });
      });
      toast.push({ tone: "success", title: "Template saved" });
    }
    setEditing(null);
  }

  function remove(id: string) {
    store.update((s) => {
      s.email_templates = (s.email_templates ?? []).filter((t) => t.id !== id);
    });
    toast.push({ tone: "info", title: "Template deleted" });
  }

  return (
    <Section
      title="Email templates"
      description="Customise templates used in the Draft Email panel. Built-ins are read-only — clone one to customise it."
      action={
        <Button
          color="primary"
          radius="lg"
          startContent={<Plus className="h-4 w-4" />}
          onPress={() => setEditing({})}
        >
          New template
        </Button>
      }
    >
      {/* Built-in templates — read only */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          Built-in
        </p>
        <ul className="space-y-2">
          {TEMPLATES.map((t) => (
            <li
              key={t.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-soft bg-white px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                  <p className="text-sm font-semibold text-ink-900">{t.label}</p>
                </div>
                <p className="mt-0.5 text-xs text-ink-500">{t.description}</p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-ink-400">{t.subject}</p>
              </div>
              <Button
                size="sm"
                variant="light"
                radius="lg"
                startContent={<Copy className="h-3.5 w-3.5" />}
                onPress={() => setEditing({ ...t, id: undefined })}
              >
                Clone
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {/* Custom templates */}
      {customTemplates.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            Custom
          </p>
          <ul className="space-y-2">
            {customTemplates.map((t) => (
              <li
                key={t.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-soft bg-white px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                    <p className="text-sm font-semibold text-ink-900">{t.label}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">{t.description}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-ink-400">{t.subject}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setEditing(t)}
                    className="rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                    aria-label={`Edit ${t.label}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    className="rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-red-600"
                    aria-label={`Delete ${t.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {customTemplates.length === 0 && (
        <p className="mt-2 text-xs text-ink-500">
          No custom templates yet. Clone a built-in or create one from scratch.
        </p>
      )}

      <TemplateModal
        initial={editing}
        onSave={save}
        onClose={() => setEditing(null)}
      />
    </Section>
  );
}

function TemplateModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Partial<EmailTemplate> | null;
  onSave: (data: {
    label: string;
    description: string;
    subject: string;
    body: string;
  }) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Sync fields whenever the modal opens or the target changes.
  useEffect(() => {
    if (initial !== null) {
      setLabel(initial.label ?? "");
      setDescription(initial.description ?? "");
      setSubject(initial.subject ?? "");
      setBody(initial.body ?? "");
    }
  }, [initial]);

  const isEditing = !!initial?.id;
  const canSave = label.trim() && subject.trim() && body.trim();

  function submit() {
    if (!canSave) return;
    onSave({
      label: label.trim(),
      description: description.trim(),
      subject: subject.trim(),
      body: body.trim(),
    });
  }

  return (
    <Modal
      isOpen={initial !== null}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="xl"
      placement="center"
      backdrop="blur"
      classNames={{ base: "rounded-3xl" }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold text-ink-900">
            {isEditing ? "Edit template" : "New template"}
          </h3>
          <p className="text-[11px] text-ink-500">
            Variables:{" "}
            {["first_name", "company", "product_name", "product_url", "sender_name"].map(
              (v) => (
                <code
                  key={v}
                  className="mr-1 rounded bg-ink-100 px-1 py-0.5 text-[10px] font-mono"
                >
                  {`{{${v}}}`}
                </code>
              ),
            )}
          </p>
        </ModalHeader>
        <ModalBody className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Label"
              value={label}
              onValueChange={setLabel}
              isRequired
              variant="bordered"
              classNames={tmplFieldCn}
              placeholder="e.g. Cold intro"
            />
            <Input
              label="Description"
              value={description}
              onValueChange={setDescription}
              variant="bordered"
              classNames={tmplFieldCn}
              placeholder="When to use this"
            />
          </div>
          <Input
            label="Subject"
            value={subject}
            onValueChange={setSubject}
            isRequired
            variant="bordered"
            classNames={tmplFieldCn}
            placeholder="e.g. Quick hello, {{first_name}}"
          />
          <Textarea
            label="Body"
            value={body}
            onValueChange={setBody}
            isRequired
            variant="bordered"
            minRows={6}
            maxRows={14}
            placeholder={`Hi {{first_name}},\n\n…\n\n— {{sender_name}}`}
            classNames={{
              inputWrapper:
                "border-soft bg-white shadow-none data-[hover=true]:border-firm font-mono",
              input: "text-sm font-mono leading-relaxed",
            }}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" isDisabled={!canSave} onPress={submit}>
            {isEditing ? "Save changes" : "Create template"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function DataPanel() {
  const snapshot = useSnapshot();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState<'seed' | 'clear' | null>(null);

  function exportSnapshot() {
    const json = store.exportJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `perchlead-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.push({ tone: "success", title: "Snapshot downloaded" });
  }

  function reset(seed: boolean) {
    store.reset(seed);
    toast.push({
      tone: "info",
      title: seed ? "Demo data restored" : "Workspace cleared",
    });
  }

  return (
    <Section
      title="Data mode"
      description="MVP runs on a local mock with localStorage persistence. Swap in Neon Postgres by replacing /lib/store/data-store.ts."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-soft bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Database className="h-4 w-4 text-primary-600" /> Current mode: Local mock
          </div>
          <p className="mt-1 text-xs text-ink-500">
            Snapshot lives in <code className="rounded bg-ink-100 px-1 py-0.5 text-[10px]">localStorage</code>{" "}
            under <code className="rounded bg-ink-100 px-1 py-0.5 text-[10px]">perchlead.store.v1</code>.
          </p>
          <p className="mt-2 text-xs text-ink-500">
            Counts: {snapshot.leads.length} leads · {snapshot.companies.length} companies ·{" "}
            {snapshot.products.length} products · {snapshot.suppressions.length} suppressions.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button radius="lg" variant="bordered" className="border-soft bg-white" onPress={exportSnapshot}>
              Download snapshot
            </Button>
            <Button radius="lg" color="primary" variant="flat" onPress={() => setConfirmReset('seed')} startContent={<RefreshCw className="h-4 w-4" />}>
              Restore demo
            </Button>
            <Button radius="lg" variant="bordered" className="border-soft bg-white text-red-700" onPress={() => setConfirmReset('clear')}>
              Clear all
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-soft bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Database className="h-4 w-4 text-primary-600" /> Neon setup
          </div>
          <p className="mt-1 text-xs text-ink-500">
            SQL schema is in <code className="rounded bg-ink-100 px-1 py-0.5 text-[10px]">/db/schema.sql</code>.
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-ink-600">
            <li>
              Create a Neon project and run{" "}
              <code className="rounded bg-ink-100 px-1 py-0.5 text-[10px]">psql $DATABASE_URL_UNPOOLED -f db/schema.sql</code>.
            </li>
            <li>
              Set <code className="rounded bg-ink-100 px-1 py-0.5 text-[10px]">DATABASE_URL</code> (pooled) and{" "}
              <code className="rounded bg-ink-100 px-1 py-0.5 text-[10px]">DATABASE_URL_UNPOOLED</code> in Vercel.
            </li>
            <li>
              Add{" "}
              <code className="rounded bg-ink-100 px-1 py-0.5 text-[10px]">@neondatabase/serverless</code> and replace
              the store implementation with a Neon-backed one.
            </li>
            <li>
              Switch <code className="rounded bg-ink-100 px-1 py-0.5 text-[10px]">NEXT_PUBLIC_DATA_MODE</code> to{" "}
              <code className="rounded bg-ink-100 px-1 py-0.5 text-[10px]">neon</code>.
            </li>
          </ol>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-firm bg-white/50 p-4 text-xs text-ink-600">
        <p className="font-semibold text-ink-800">HeroUI Pro</p>
        <p className="mt-1">
          The app ships with the open-source HeroUI components. To use HeroUI Pro components, follow{" "}
          <code className="rounded bg-ink-100 px-1 py-0.5 text-[10px]">docs/HEROUI_PRO_SETUP.md</code> to authenticate
          the Pro registry. The component layout is structured so Pro components can drop in directly.
        </p>
      </div>
      <ConfirmDialog
        open={confirmReset === 'seed'}
        title="Restore demo data?"
        description="This will replace your current local data with a fresh demo set."
        confirmLabel="Restore demo"
        onConfirm={() => {
          reset(true);
          setConfirmReset(null);
        }}
        onCancel={() => setConfirmReset(null)}
      />
      <ConfirmDialog
        open={confirmReset === 'clear'}
        title="Clear all data?"
        description="This will wipe your entire local workspace. This cannot be undone."
        confirmLabel="Clear all"
        isDangerous
        onConfirm={() => {
          reset(false);
          setConfirmReset(null);
        }}
        onCancel={() => setConfirmReset(null)}
      />
    </Section>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-soft surface-panel p-5 shadow-soft">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
          {description && <p className="text-xs text-ink-500">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
