import { z } from "zod";

// Helpers ------------------------------------------------------------------

/** Treat empty strings as undefined so `.optional()` works for HTML inputs. */
const emptyToUndefined = z
  .union([z.string(), z.undefined()])
  .transform((v) => {
    if (v == null) return undefined;
    const trimmed = v.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  });

/** Auto-prefix bare domains with https:// on submit. */
const optionalUrl = emptyToUndefined.transform((v) => {
  if (!v) return undefined;
  if (/^https?:\/\//i.test(v)) return v;
  // If it looks like a domain (contains a dot) and not already a path, prefix.
  if (/^[\w-]+(\.[\w-]+)+/.test(v)) return `https://${v}`;
  return v;
});

/** Optional email — empty string -> undefined, else must be a valid address. */
const optionalEmail = emptyToUndefined.pipe(z.string().email("Looks malformed").optional());

// Schema -------------------------------------------------------------------

export const leadDraftSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: optionalEmail,
  phone: emptyToUndefined.pipe(z.string().max(40).optional()),
  title: emptyToUndefined.pipe(z.string().max(120).optional()),
  company_name: emptyToUndefined.pipe(z.string().max(160).optional()),
  website: optionalUrl.pipe(z.string().max(240).optional()),
  linkedin_url: optionalUrl.pipe(z.string().max(240).optional()),
  location: emptyToUndefined.pipe(z.string().max(160).optional()),
  notes: emptyToUndefined.pipe(z.string().max(2000).optional()),
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
