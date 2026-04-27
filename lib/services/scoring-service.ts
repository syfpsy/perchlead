// Rule-based lead scoring. Returns a 0..100 score plus an explainable
// breakdown so the UI can show "Why this score?".
//
// Suppressed / Do-Not-Contact leads are forced to 0 and the reason is
// surfaced as a hard warning.

import type {
  Company,
  Lead,
  LeadProductInterest,
  ScoreReason,
  ScoreResult,
  Source,
} from "@/types";
import { isEmailish } from "@/lib/utils/string";

interface ScoreInput {
  lead: Lead;
  company?: Company | null;
  source?: Source | null;
  interests?: LeadProductInterest[];
  hasInteractions?: boolean;
}

const SOURCE_QUALITY: Record<string, number> = {
  manual: 0.9,
  csv: 0.7,
  paste: 0.6,
  webhook: 0.85,
  google_sheets: 0.75,
  gumroad: 1,
  lemon_squeezy: 1,
  paddle: 1,
  appsumo: 0.95,
  hubspot: 0.85,
  smartlead: 0.6,
  instantly: 0.6,
  lead_finder: 0.55,
  other: 0.5,
};

export function scoreLead(input: ScoreInput): ScoreResult {
  const { lead, company, source, interests = [], hasInteractions } = input;
  const reasons: ScoreReason[] = [];
  const warnings: string[] = [];

  if (lead.is_suppressed) {
    return {
      score: 0,
      reasons: [
        { signal: "do_not_contact", delta: -100, detail: "Lead is on the suppression list." },
      ],
      warnings: ["Do Not Contact: this lead must not be exported for outreach."],
      next_action: "Leave alone. Confirm suppression reason in the compliance panel.",
    };
  }

  let score = 0;

  if (lead.email && isEmailish(lead.email)) {
    score += 25;
    reasons.push({ signal: "valid_email", delta: 25, detail: "Has a valid-looking email." });
  } else if (lead.email) {
    warnings.push("Email looks malformed.");
    reasons.push({ signal: "email_malformed", delta: 0, detail: "Email failed basic shape check." });
  } else {
    warnings.push("No email on file.");
  }

  if (company?.domain || lead.website) {
    score += 15;
    reasons.push({ signal: "has_company_website", delta: 15, detail: "Linked to a company website." });
  }

  if (lead.title) {
    score += 8;
    reasons.push({ signal: "has_title", delta: 8, detail: `Title: ${lead.title}` });
  }

  if (lead.location) {
    score += 4;
    reasons.push({ signal: "has_location", delta: 4 });
  }

  if (lead.linkedin_url) {
    score += 6;
    reasons.push({ signal: "has_linkedin", delta: 6 });
  }

  if (interests.length > 0) {
    const top = interests.reduce<LeadProductInterest | null>(
      (best, cur) =>
        !best || levelWeight(cur.interest_level) > levelWeight(best.interest_level) ? cur : best,
      null,
    );
    const delta =
      top!.interest_level === "high" ? 20 : top!.interest_level === "medium" ? 12 : 6;
    score += delta;
    reasons.push({
      signal: "product_interest",
      delta,
      detail: `${interests.length} product interest${interests.length === 1 ? "" : "s"} (top: ${top!.interest_level}).`,
    });
  }

  if (source) {
    const q = SOURCE_QUALITY[source.type] ?? 0.5;
    const delta = Math.round(q * 12);
    score += delta;
    reasons.push({
      signal: "source_quality",
      delta,
      detail: `Source "${source.name}" rated ${(q * 100).toFixed(0)}/100.`,
    });
  }

  const ageDays =
    (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays < 7) {
    score += 10;
    reasons.push({ signal: "freshness", delta: 10, detail: "Imported in the last 7 days." });
  } else if (ageDays > 90) {
    score -= 10;
    reasons.push({ signal: "stale", delta: -10, detail: "Older than 90 days, may need re-verification." });
  }

  if (hasInteractions) {
    score += 8;
    reasons.push({ signal: "prior_interaction", delta: 8, detail: "Has prior interactions on file." });
  }

  if (!lead.email && !lead.phone && !lead.linkedin_url) {
    score -= 30;
    reasons.push({
      signal: "no_contact_method",
      delta: -30,
      detail: "No reachable contact method.",
    });
    warnings.push("No way to reach this lead — enrich before outreach.");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const next_action = suggestNextAction({ score, lead, hasInteractions, interests });

  return { score, reasons, warnings, next_action };
}

function levelWeight(l: LeadProductInterest["interest_level"]): number {
  return l === "high" ? 3 : l === "medium" ? 2 : 1;
}

function suggestNextAction(opts: {
  score: number;
  lead: Lead;
  hasInteractions?: boolean;
  interests: LeadProductInterest[];
}): string {
  const { score, lead, hasInteractions, interests } = opts;
  if (lead.status === "do_not_contact") return "Suppressed — leave alone.";
  if (!lead.email && !lead.phone && !lead.linkedin_url) return "Enrich: find a contact method.";
  if (score >= 75 && !hasInteractions) {
    const product = interests[0]?.product_id ? "matching product interest" : "high score";
    return `Reach out — ${product}.`;
  }
  if (score >= 50 && lead.status === "new") return "Qualify: review fit and tag accordingly.";
  if (lead.status === "contacted") return "Follow up if no reply in 3 days.";
  if (lead.status === "replied") return "Move to qualified or converted.";
  if (interests.length === 0) return "Tag with a product interest.";
  return "Review and clean.";
}
