// Email template engine. Tiny, no-dependency variable interpolation.
// Templates ship as a static set today; future versions will store them in
// the DB per workspace and surface a Settings → Templates editor.

import type { Company, Lead, LeadProductInterest, Product } from "@/types";

export interface EmailTemplate {
  id: string;
  label: string;
  description: string;
  subject: string;
  body: string;
  /** Hint when no product interest matches. */
  recommendedFor?: string;
}

/**
 * Variables a template can reference. Keep this stable — adding a new var is
 * fine; renaming one breaks existing templates so we won't.
 */
export interface TemplateVars {
  first_name: string;
  full_name: string;
  company: string;
  product_name: string;
  product_url: string;
  sender_name: string;
}

/** Render with safe defaults for missing vars. */
export function renderTemplate(
  template: EmailTemplate,
  vars: Partial<TemplateVars>,
): { subject: string; body: string } {
  const merged: TemplateVars = {
    first_name: vars.first_name ?? "there",
    full_name: vars.full_name ?? "",
    company: vars.company ?? "your team",
    product_name: vars.product_name ?? "Perchlead",
    product_url: vars.product_url ?? "https://perchlead.app",
    sender_name: vars.sender_name ?? "the Perchlead team",
  };
  return {
    subject: interpolate(template.subject, merged),
    body: interpolate(template.body, merged),
  };
}

function interpolate(s: string, vars: TemplateVars): string {
  return s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    return (vars as unknown as Record<string, string>)[key] ?? `{{${key}}}`;
  });
}

/** Build TemplateVars from a lead. Picks the highest-interest product. */
export function buildVarsForLead(args: {
  lead: Lead;
  company: Company | null;
  topInterest?: { product: Product; interest: LeadProductInterest } | null;
  senderName?: string;
}): Partial<TemplateVars> {
  const { lead, company, topInterest, senderName } = args;
  const parts = lead.name.trim().split(/\s+/);
  return {
    first_name: parts[0] ?? "there",
    full_name: lead.name,
    company: company?.name ?? "",
    product_name: topInterest?.product.name ?? "",
    product_url: topInterest?.product.url ?? "",
    sender_name: senderName ?? "",
  };
}

export const TEMPLATES: EmailTemplate[] = [
  {
    id: "warm_intro",
    label: "Warm intro",
    description: "Short, casual first reach-out. Best for organic / inbound leads.",
    subject: "Quick hello, {{first_name}}",
    body: `Hi {{first_name}},

Saw you might be a fit for {{product_name}} — sending a quick note in case it's useful.

{{product_url}}

Happy to answer anything or stay out of your inbox if it's not the right time.

— {{sender_name}}`,
    recommendedFor: "form_submission · newsletter_signup · public_directory",
  },
  {
    id: "post_purchase",
    label: "Post-purchase check-in",
    description: "For buyers — light onboarding nudge.",
    subject: "How's {{product_name}} treating you?",
    body: `Hey {{first_name}},

Wanted to check in now that you're a few days in with {{product_name}}. Anything tripping you up, or features you wish were there?

Reply with anything; I read every message.

— {{sender_name}}`,
    recommendedFor: "purchase",
  },
  {
    id: "fit_recommendation",
    label: "Fit recommendation",
    description: "When a lead is a strong product fit but hasn't been contacted.",
    subject: "{{first_name}}, {{product_name}} might fit {{company}}",
    body: `Hi {{first_name}},

I noticed {{company}} could be a really clean fit for {{product_name}} — happy to walk through how others in your space have used it, or just send a 2-min loom if you'd rather keep it async.

{{product_url}}

— {{sender_name}}`,
    recommendedFor: "qualified leads with high product interest",
  },
  {
    id: "soft_followup",
    label: "Soft follow-up",
    description: "When you've reached out but heard nothing back.",
    subject: "Bumping this — {{product_name}} for {{company}}",
    body: `Hey {{first_name}},

Bumping my last note in case it slipped past. No pressure if it's not the right time — happy to circle back next quarter.

— {{sender_name}}`,
    recommendedFor: "contacted leads with no reply",
  },
];
