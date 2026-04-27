import { z } from "zod";

export const leadDraftSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z
    .string()
    .trim()
    .email("Looks malformed")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  company_name: z.string().trim().max(160).optional().or(z.literal("")),
  website: z.string().trim().max(240).optional().or(z.literal("")),
  linkedin_url: z.string().trim().max(240).optional().or(z.literal("")),
  location: z.string().trim().max(160).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
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
});

export type LeadDraftInput = z.infer<typeof leadDraftSchema>;
