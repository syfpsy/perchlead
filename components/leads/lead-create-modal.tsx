"use client";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
  Tooltip,
} from "@heroui/react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Copy } from "lucide-react";

import { leadDraftSchema, type LeadDraftInput } from "@/lib/validators/lead";
import { createLead } from "@/lib/services/lead-service";
import { findDuplicates } from "@/lib/services/dedupe-service";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useSnapshot } from "@/lib/store/use-snapshot";
import { Avatar } from "@/components/ui/avatar";

const CONSENT_OPTIONS: Array<{ key: NonNullable<LeadDraftInput["consent_basis"]>; label: string }> = [
  { key: "user_provided", label: "User provided" },
  { key: "purchase", label: "Purchase / customer" },
  { key: "newsletter_signup", label: "Newsletter signup" },
  { key: "form_submission", label: "Form submission" },
  { key: "manual_entry", label: "Manual entry" },
  { key: "public_directory", label: "Public directory" },
  { key: "unknown", label: "Unknown" },
];

const DEFAULT_VALUES: LeadDraftInput = {
  name: "",
  email: undefined,
  phone: undefined,
  title: undefined,
  company_name: undefined,
  website: undefined,
  linkedin_url: undefined,
  location: undefined,
  notes: undefined,
  consent_basis: "manual_entry",
};

export function LeadCreateModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const snapshot = useSnapshot();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
    setFocus,
  } = useForm<LeadDraftInput>({
    resolver: zodResolver(leadDraftSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
  });

  // Reset whenever the modal closes, and focus name on open.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setFocus("name"), 60);
      return () => clearTimeout(t);
    }
    reset(DEFAULT_VALUES);
  }, [open, reset, setFocus]);

  // Live duplicate detection — watches the relevant fields and asks the
  // dedupe service. Pure, runs in render; no debounce needed for ~12 leads.
  const watched = useWatch({
    control,
    name: ["email", "name", "company_name", "website"],
  });
  const [emailW, nameW, companyW, websiteW] = watched;

  const duplicates = useMemo(() => {
    if (!emailW && !nameW && !companyW && !websiteW) return [];
    return findDuplicates(
      {
        email: emailW ?? null,
        name: nameW ?? null,
        company_name: companyW ?? null,
        website: websiteW ?? null,
      },
      { leads: snapshot.leads, companies: snapshot.companies },
    ).slice(0, 3);
  }, [emailW, nameW, companyW, websiteW, snapshot.leads, snapshot.companies]);

  const submit = handleSubmit((data) => {
    const result = createLead({
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      title: data.title ?? null,
      company_name: data.company_name ?? null,
      website: data.website ?? null,
      linkedin_url: data.linkedin_url ?? null,
      location: data.location ?? null,
      notes: data.notes ?? null,
      consent_basis: data.consent_basis ?? "manual_entry",
    });
    toast.push({
      tone: "success",
      title: "Lead saved",
      description: result.lead.is_suppressed
        ? "Marked Do Not Contact (matched suppression list)."
        : `Score ${result.lead.score} · ${result.lead.score_reason?.next_action ?? "Review."}`,
    });
    reset(DEFAULT_VALUES);
    onOpenChange(false);
    router.push(`/leads/${result.lead.id}`);
  });

  return (
    <Modal
      isOpen={open}
      onOpenChange={onOpenChange}
      size="lg"
      placement="center"
      backdrop="blur"
      classNames={{ base: "rounded-3xl" }}
    >
      <ModalContent>
        {/* noValidate: defer to Zod, don't let HTML5 type=email block submission */}
        <form onSubmit={submit} noValidate>
          <ModalHeader className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold tracking-tightish text-ink-900">Add a lead</h3>
            <p className="text-xs text-ink-500">
              Just a name is required. Domains and LinkedIn URLs auto-prefix with{" "}
              <code className="rounded bg-ink-100 px-1 py-0.5 text-[10px]">https://</code>.
            </p>
          </ModalHeader>
          <ModalBody className="space-y-3">
            {duplicates.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2">
                <div className="flex items-start gap-2">
                  <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-amber-900">
                      Possible duplicate{duplicates.length === 1 ? "" : "s"}
                    </p>
                    <p className="text-[11px] text-amber-700">
                      Save anyway, or open one of these to merge later.
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {duplicates.map((d) => (
                        <li
                          key={d.lead.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1 ring-1 ring-amber-100"
                        >
                          <Link
                            href={`/leads/${d.lead.id}`}
                            onClick={() => onOpenChange(false)}
                            className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
                          >
                            <Avatar name={d.lead.name} size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="truncate text-xs font-medium text-ink-900">
                                {d.lead.name}
                              </span>
                              <span className="block truncate text-[11px] text-ink-500">
                                {d.detail}
                              </span>
                            </span>
                          </Link>
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                            {(d.confidence * 100).toFixed(0)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                {...register("name")}
                label="Name"
                isRequired
                autoComplete="name"
                isInvalid={!!errors.name}
                errorMessage={errors.name?.message}
              />
              <Input
                {...register("email")}
                label="Email"
                type="email"
                autoComplete="email"
                inputMode="email"
                isInvalid={!!errors.email}
                errorMessage={errors.email?.message}
              />
              <Input {...register("title")} label="Title" autoComplete="organization-title" />
              <Input {...register("phone")} label="Phone" type="tel" autoComplete="tel" />
              <Input {...register("company_name")} label="Company" autoComplete="organization" />
              <Input
                {...register("website")}
                label="Website"
                placeholder="example.com"
                autoComplete="url"
                inputMode="url"
              />
              <Input
                {...register("linkedin_url")}
                label="LinkedIn"
                placeholder="linkedin.com/in/…"
                autoComplete="url"
                inputMode="url"
              />
              <Input {...register("location")} label="Location" autoComplete="address-level2" />
            </div>
            <Controller
              control={control}
              name="consent_basis"
              render={({ field }) => (
                <Select
                  label="Consent / legal basis"
                  selectedKeys={field.value ? [field.value] : []}
                  onSelectionChange={(keys) => {
                    const k = Array.from(keys)[0];
                    field.onChange(k as LeadDraftInput["consent_basis"]);
                  }}
                  classNames={{ trigger: "border-soft" }}
                >
                  {CONSENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key}>{opt.label}</SelectItem>
                  ))}
                </Select>
              )}
            />
            <Textarea
              {...register("notes")}
              label="Notes"
              minRows={2}
              placeholder="What do you know about this lead?"
            />
          </ModalBody>
          <ModalFooter className="flex items-center justify-between gap-2">
            <Tooltip content="Submit with ⌘↵" placement="top">
              <p className="text-[11px] text-ink-500">
                {Object.keys(errors).length > 0
                  ? `${Object.keys(errors).length} field${Object.keys(errors).length === 1 ? "" : "s"} need fixing`
                  : "Ready to save"}
              </p>
            </Tooltip>
            <div className="flex items-center gap-2">
              <Button
                variant="light"
                type="button"
                onPress={() => {
                  reset(DEFAULT_VALUES);
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" color="primary" isLoading={isSubmitting}>
                Save lead
              </Button>
            </div>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
