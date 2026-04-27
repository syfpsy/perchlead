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
} from "@heroui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadDraftSchema, type LeadDraftInput } from "@/lib/validators/lead";
import { createLead } from "@/lib/services/lead-service";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

const CONSENT_OPTIONS: Array<{ key: LeadDraftInput["consent_basis"] & string; label: string }> = [
  { key: "user_provided", label: "User provided" },
  { key: "purchase", label: "Purchase / customer" },
  { key: "newsletter_signup", label: "Newsletter signup" },
  { key: "form_submission", label: "Form submission" },
  { key: "manual_entry", label: "Manual entry" },
  { key: "public_directory", label: "Public directory" },
  { key: "unknown", label: "Unknown" },
];

export function LeadCreateModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<LeadDraftInput>({
    resolver: zodResolver(leadDraftSchema),
    defaultValues: { consent_basis: "manual_entry" },
  });

  const consent = watch("consent_basis");

  const submit = handleSubmit((data) => {
    const result = createLead({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      title: data.title || null,
      company_name: data.company_name || null,
      website: data.website || null,
      linkedin_url: data.linkedin_url || null,
      location: data.location || null,
      notes: data.notes || null,
      consent_basis: data.consent_basis ?? "manual_entry",
    });
    toast.push({
      tone: "success",
      title: "Lead saved",
      description: result.lead.is_suppressed
        ? "Marked Do Not Contact (matched suppression list)."
        : `Score ${result.lead.score} · ${result.lead.score_reason?.next_action ?? "Review."}`,
    });
    reset();
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
        <form onSubmit={submit}>
          <ModalHeader className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold tracking-tightish text-ink-900">Add a lead</h3>
            <p className="text-xs text-ink-500">
              Just a name is required. Everything else can be filled in later.
            </p>
          </ModalHeader>
          <ModalBody className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                {...register("name")}
                label="Name"
                isRequired
                isInvalid={!!errors.name}
                errorMessage={errors.name?.message}
              />
              <Input
                {...register("email")}
                label="Email"
                type="email"
                isInvalid={!!errors.email}
                errorMessage={errors.email?.message}
              />
              <Input {...register("title")} label="Title" />
              <Input {...register("phone")} label="Phone" />
              <Input {...register("company_name")} label="Company" />
              <Input {...register("website")} label="Website" placeholder="https://" />
              <Input {...register("linkedin_url")} label="LinkedIn URL" />
              <Input {...register("location")} label="Location" />
            </div>
            <Select
              label="Consent / legal basis"
              selectedKeys={consent ? [consent] : []}
              onSelectionChange={(keys) => {
                const k = Array.from(keys)[0];
                if (k) setValue("consent_basis", k as LeadDraftInput["consent_basis"]);
              }}
            >
              {CONSENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.key}>{opt.label}</SelectItem>
              ))}
            </Select>
            <Textarea
              {...register("notes")}
              label="Notes"
              minRows={2}
              placeholder="What do you know about this lead?"
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              type="button"
              onPress={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" color="primary" isLoading={isSubmitting}>
              Save lead
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
