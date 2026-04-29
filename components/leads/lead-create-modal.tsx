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
} from "@/lib/heroui-compat";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

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

/**
 * Shared inputWrapper classNames applied to every bordered input in this form.
 * Keeps visual language consistent: same border color, same hover/focus ring,
 * no extra shadow fighting with HeroUI's default flat shadow.
 */
const fieldCn = {
  inputWrapper:
    "border-soft bg-panel shadow-none data-[hover=true]:border-firm",
  input: "text-sm",
} as const;

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

  // Reset whenever the modal closes, focus name on open.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setFocus("name"), 60);
      return () => clearTimeout(t);
    }
    reset(DEFAULT_VALUES);
  }, [open, reset, setFocus]);

  // Live duplicate detection — pure, no debounce needed for the local store.
  const [emailW, nameW, companyW, websiteW] = useWatch({
    control,
    name: ["email", "name", "company_name", "website"],
  });

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

  const errorCount = Object.keys(errors).length;

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
      size="xl"
      placement="center"
      backdrop="blur"
      scrollBehavior="inside"
      classNames={{ base: "rounded-3xl" }}
    >
      <ModalContent>
        {/*
          noValidate: defer all validation to Zod.
          HTML5's type=email / required can block submission and show native UI
          that conflicts with HeroUI's error styling — we handle everything ourselves.
        */}
        <form onSubmit={submit} noValidate>
          <ModalHeader className="flex flex-col gap-0.5">
            <h3 className="text-lg font-semibold tracking-tightish text-ink-900 dark:text-ink-100">
              Add a lead
            </h3>
            <p className="text-xs font-normal text-ink-500">
              Name is the only required field. Bare domains auto-prefix with{" "}
              <code className="rounded bg-ink-100 dark:bg-ink-800 px-1 py-0.5 text-[10px]">
                https://
              </code>
              .
            </p>
          </ModalHeader>

          <ModalBody className="space-y-3 pb-4 pt-2">
            {/* ── Identity (full-width, errors safe here) ───────────── */}
            <Input
              {...register("name")}
              label="Full name"
              isRequired
              variant="bordered"
              autoComplete="name"
              isInvalid={!!errors.name}
              errorMessage={errors.name?.message}
              classNames={fieldCn}
            />
            {/*
              inputMode="email" hints mobile keyboards without engaging
              type="email" browser validation (which overrides noValidate in
              some HeroUI versions and adds an unwanted native error badge).
            */}
            <Input
              {...register("email")}
              label="Email address"
              variant="bordered"
              inputMode="email"
              autoComplete="email"
              isInvalid={!!errors.email}
              errorMessage={errors.email?.message}
              classNames={fieldCn}
            />

            {/* ── Possible duplicate warning ─────────────────────────── */}
            {duplicates.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-amber-900">
                      Possible duplicate{duplicates.length > 1 ? "s" : ""}
                    </p>
                    <p className="text-[11px] text-amber-700">
                      Save anyway, or open one of these and merge later.
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {duplicates.map((d) => (
                        <li
                          key={d.lead.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-panel px-2 py-1 ring-1 ring-amber-100"
                        >
                          <Link
                            href={`/leads/${d.lead.id}`}
                            onClick={() => onOpenChange(false)}
                            className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
                          >
                            <Avatar name={d.lead.name} size="sm" />
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-medium text-ink-900">
                                {d.lead.name}
                              </span>
                              <span className="block truncate text-[11px] text-ink-500">
                                {d.detail}
                              </span>
                            </span>
                          </Link>
                          <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            {(d.confidence * 100).toFixed(0)}% match
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ── Optional profile details (2-col, no inline errors) ─── */}
            {/*
              No isInvalid / errorMessage on these optional inputs — they're all
              optional strings, so height stays perfectly uniform across both
              columns.  Any schema violations surface in the footer count.
            */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                {...register("title")}
                label="Job title"
                variant="bordered"
                autoComplete="organization-title"
                classNames={fieldCn}
              />
              <Input
                {...register("phone")}
                label="Phone"
                type="tel"
                variant="bordered"
                autoComplete="tel"
                classNames={fieldCn}
              />
              <Input
                {...register("company_name")}
                label="Company"
                variant="bordered"
                autoComplete="organization"
                classNames={fieldCn}
              />
              <Input
                {...register("location")}
                label="Location"
                variant="bordered"
                autoComplete="address-level2"
                classNames={fieldCn}
              />
              <Input
                {...register("website")}
                label="Website"
                variant="bordered"
                placeholder="example.com"
                inputMode="url"
                autoComplete="url"
                classNames={fieldCn}
              />
              <Input
                {...register("linkedin_url")}
                label="LinkedIn"
                variant="bordered"
                placeholder="linkedin.com/in/…"
                inputMode="url"
                autoComplete="url"
                classNames={fieldCn}
              />
            </div>

            {/* ── Legal basis ────────────────────────────────────────── */}
            <Controller
              control={control}
              name="consent_basis"
              render={({ field }) => (
                <Select
                  label="Consent / legal basis"
                  variant="bordered"
                  selectedKeys={field.value ? [field.value] : []}
                  onSelectionChange={(keys) => {
                    const k = Array.from(keys as Iterable<React.Key>)[0];
                    field.onChange(k as LeadDraftInput["consent_basis"]);
                  }}
                  classNames={{
                    trigger:
                      "border-soft bg-panel shadow-none data-[hover=true]:border-firm min-h-[54px]",
                    value: "text-sm",
                    label: "text-sm",
                  }}
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
              variant="bordered"
              minRows={2}
              maxRows={5}
              placeholder="What do you know about this lead?"
              classNames={{
                inputWrapper:
                  "border-soft bg-panel shadow-none data-[hover=true]:border-firm",
                input: "text-sm",
              }}
            />
          </ModalBody>

          <ModalFooter className="flex items-center justify-between gap-2">
            <p
              className={
                errorCount > 0
                  ? "text-[11px] font-medium text-danger-600"
                  : "text-[11px] text-ink-500"
              }
            >
              {errorCount > 0
                ? `${errorCount} field${errorCount === 1 ? "" : "s"} need${errorCount === 1 ? "s" : ""} fixing`
                : "Ready to save"}
            </p>
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
