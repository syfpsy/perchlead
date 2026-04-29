"use client";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tab,
  Tabs,
  Textarea,
  Tooltip,
} from "@heroui/react";
import { Check, Copy, Mail, Send } from "lucide-react";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import type { Company, Lead, LeadProductInterest, Product } from "@/types";
import {
  TEMPLATES,
  buildVarsForLead,
  renderTemplate,
  type EmailTemplate,
} from "@/lib/services/email-template-service";
import { addInteraction, setLeadStatus } from "@/lib/services/lead-service";
import { useToast } from "@/components/ui/toast";

export function EmailDraftModal({
  open,
  lead,
  company,
  topInterest,
  onOpenChange,
}: {
  open: boolean;
  lead: Lead;
  company: Company | null;
  topInterest?: { product: Product; interest: LeadProductInterest } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useToast();
  const [templateId, setTemplateId] = useState<string>(TEMPLATES[0]!.id);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Re-render the template whenever the picked template or the lead changes.
  useEffect(() => {
    const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]!;
    const vars = buildVarsForLead({ lead, company, topInterest });
    const out = renderTemplate(template, vars);
    setSubject(out.subject);
    setBody(out.body);
  }, [templateId, lead, company, topInterest]);

  const template: EmailTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]!,
    [templateId],
  );

  const mailtoHref = useMemo(() => {
    if (!lead.email) return "";
    const params = new URLSearchParams({
      subject,
      body,
    });
    return `mailto:${encodeURIComponent(lead.email)}?${params.toString()}`;
  }, [lead.email, subject, body]);

  function copy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    toast.push({ tone: "success", title: "Copied to clipboard" });
  }

  function logSend() {
    addInteraction({
      leadId: lead.id,
      type: "email",
      note: `Drafted "${template.label}" — sent via mailto.`,
    });
    if (lead.status === "new" || lead.status === "qualified" || lead.status === "enriched") {
      setLeadStatus(lead.id, "contacted");
    }
    toast.push({
      tone: "success",
      title: "Email logged",
      description: `Marked as contacted.`,
    });
    onOpenChange(false);
  }

  if (!lead.email) {
    return (
      <Modal isOpen={open} onOpenChange={onOpenChange} size="md" placement="center" backdrop="blur">
        <ModalContent>
          <ModalHeader>Can't draft — no email on file</ModalHeader>
          <ModalBody>
            <p className="text-sm text-ink-600">
              {lead.name} doesn't have an email yet. Add one with the Enrich button or via the
              contact card, then come back.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onPress={() => onOpenChange(false)}>
              Got it
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange} size="2xl" placement="center" backdrop="blur">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <Mail className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-base font-semibold text-ink-900">Draft an email</h3>
          </div>
          <p className="text-xs text-ink-500">
            Picks a template, fills variables from the lead, and opens your default mail client.
            Marks the lead as <span className="rounded bg-ink-100 px-1 py-0.5 text-[10px]">contacted</span> when you click Send.
          </p>
        </ModalHeader>
        <ModalBody className="space-y-3">
          <Tabs
            aria-label="Templates"
            size="sm"
            radius="full"
            variant="solid"
            selectedKey={templateId}
            onSelectionChange={(k) => setTemplateId(String(k))}
            classNames={{
              tabList: "flex-wrap bg-ink-100/70 p-1",
              tab: "text-xs px-3",
              cursor: "shadow-soft",
            }}
          >
            {TEMPLATES.map((t) => (
              <Tab key={t.id} title={t.label} />
            ))}
          </Tabs>
          <p className="text-[11px] text-ink-500">{template.description}</p>

          <div className="rounded-2xl border border-soft bg-white">
            <div className="flex items-center gap-2 border-b border-soft px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                To
              </span>
              <span className="truncate text-sm text-ink-800">{lead.email}</span>
            </div>
            <div className="flex items-center gap-2 border-b border-soft px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                Subject
              </span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-transparent text-sm text-ink-800 outline-none"
              />
            </div>
            <Textarea
              value={body}
              onValueChange={setBody}
              minRows={8}
              maxRows={14}
              classNames={{
                inputWrapper: "border-0 bg-transparent shadow-none",
                input: "text-sm font-mono leading-relaxed",
              }}
            />
          </div>

          <UnfilledHint subject={subject} body={body} />
        </ModalBody>
        <ModalFooter className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-ink-500">
            mailto opens your default mail client — your sending tool decides what happens next.
          </p>
          <div className="flex items-center gap-2">
            <Tooltip content="Copy subject + body">
              <Button
                variant="bordered"
                radius="lg"
                className="border-soft bg-white"
                startContent={<Copy className="h-3.5 w-3.5" />}
                onPress={copy}
              >
                Copy
              </Button>
            </Tooltip>
            <Button
              as="a"
              href={mailtoHref}
              target="_blank"
              rel="noreferrer"
              color="primary"
              radius="lg"
              startContent={<Send className="h-3.5 w-3.5" />}
              onPress={logSend}
            >
              Send via mail client
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function UnfilledHint({ subject, body }: { subject: string; body: string }) {
  const unfilled = Array.from(
    new Set(
      [subject, body]
        .join("\n")
        .match(/\{\{\s*\w+\s*\}\}/g)
        ?.map((t) => t.replace(/\{\{\s*|\s*\}\}/g, "")) ?? [],
    ),
  );
  if (!unfilled.length) {
    return (
      <p className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700">
        <Check className="h-3 w-3" /> All variables filled.
      </p>
    );
  }
  return (
    <p className="text-[11px] text-amber-700">
      Unfilled variables — fill or remove before sending:
      <span className="ml-1 inline-flex flex-wrap gap-1">
        {unfilled.map((v) => (
          <span
            key={v}
            className={clsx(
              "rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-mono ring-1 ring-amber-200",
            )}
          >
            {`{{${v}}}`}
          </span>
        ))}
      </span>
    </p>
  );
}
