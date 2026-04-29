import { z } from "zod";

/**
 * Public webhook payload schema for `POST /api/webhooks/lead`.
 *
 * Designed to be friendly to whatever is producing leads upstream:
 * - Headers OR body can be JSON; we only consume body.
 * - Common alias keys are accepted (full_name vs name, organization vs company).
 * - All fields are optional individually; the only hard requirement is
 *   "name OR email", because without one we can't even render or dedupe.
 */
export const webhookLeadSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    full_name: z.string().trim().min(1).max(160).optional(),
    first_name: z.string().trim().max(80).optional(),
    last_name: z.string().trim().max(80).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().max(40).optional(),
    title: z.string().trim().max(160).optional(),
    company: z.string().trim().max(200).optional(),
    organization: z.string().trim().max(200).optional(),
    company_name: z.string().trim().max(200).optional(),
    website: z.string().trim().max(300).optional(),
    url: z.string().trim().max(300).optional(),
    linkedin_url: z.string().trim().max(300).optional(),
    location: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(4000).optional(),
    source: z.string().trim().max(120).optional(),
    consent_basis: z
      .enum([
        "user_provided",
        "purchase",
        "newsletter_signup",
        "form_submission",
        "manual_entry",
        "public_directory",
        "unknown",
      ])
      .optional(),
    /** Free-form metadata to stash under raw_payload_json. */
    metadata: z.record(z.unknown()).optional(),
  })
  .refine(
    (v) => {
      const namey =
        v.name ??
        v.full_name ??
        `${v.first_name ?? ""} ${v.last_name ?? ""}`.trim();
      return Boolean(namey || v.email);
    },
    { message: "Provide at least a name or an email." },
  );

export type WebhookLeadPayload = z.infer<typeof webhookLeadSchema>;

/** Coalesce alias fields onto the canonical names our service expects. */
export function normalizeWebhookPayload(p: WebhookLeadPayload) {
  const composed = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  const name =
    p.name ??
    p.full_name ??
    (composed.length > 0 ? composed : undefined) ??
    p.email?.split("@")[0] ??
    "Unnamed lead";
  return {
    name,
    email: p.email ?? null,
    phone: p.phone ?? null,
    title: p.title ?? null,
    company_name: p.company ?? p.organization ?? p.company_name ?? null,
    website: p.website ?? p.url ?? null,
    linkedin_url: p.linkedin_url ?? null,
    location: p.location ?? null,
    notes: p.notes ?? null,
    source_label: p.source ?? null,
    consent_basis: p.consent_basis ?? "form_submission",
    metadata: p.metadata ?? null,
  };
}
