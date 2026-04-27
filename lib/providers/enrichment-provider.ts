// Enrichment provider abstraction. The real implementation will call
// Hunter / Apollo / People Data Labs; for MVP we ship a mock that fabricates
// a plausible response from public-style data already on the lead.

import type { Company, Lead } from "@/types";

export interface EnrichmentResult {
  source: string;
  fields: Partial<{
    title: string;
    location: string;
    linkedin_url: string;
    company_industry: string;
    company_size: string;
    company_description: string;
    tech_stack: string[];
  }>;
  confidence: number;
  cost_estimate_usd: number;
}

export interface EnrichmentProvider {
  name: string;
  enrich(lead: Lead, company?: Company | null): Promise<EnrichmentResult>;
}

export const mockEnrichmentProvider: EnrichmentProvider = {
  name: "mock",
  async enrich(lead, company) {
    await sleep(450);
    const seed = (lead.email ?? lead.name ?? "x").length;
    const industries = ["SaaS", "Agency", "Media", "Studio", "Marketplace", "Consultancy"];
    const sizes = ["1-10", "11-50", "51-200", "201-500"];
    return {
      source: "mock",
      confidence: 0.55,
      cost_estimate_usd: 0,
      fields: {
        title: lead.title ?? defaultTitle(seed),
        location: lead.location ?? defaultLocation(seed),
        linkedin_url:
          lead.linkedin_url ??
          (lead.email
            ? `https://www.linkedin.com/in/${(lead.email.split("@")[0] ?? "")
                .replace(/[^a-z0-9]/g, "-")
                .toLowerCase()}`
            : undefined),
        company_industry: company?.industry ?? industries[seed % industries.length],
        company_size: company?.size ?? sizes[seed % sizes.length],
        company_description:
          company?.description ?? `A ${industries[seed % industries.length]?.toLowerCase()} business.`,
        tech_stack: company?.tech_stack ?? defaultStack(seed),
      },
    };
  },
};

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

function defaultTitle(seed: number): string {
  const titles = ["Founder", "CTO", "Head of Growth", "Designer", "Producer", "Marketing Lead"];
  return titles[seed % titles.length]!;
}

function defaultLocation(seed: number): string {
  const locs = ["Berlin, DE", "Istanbul, TR", "London, UK", "Lisbon, PT", "Austin, TX", "Remote"];
  return locs[seed % locs.length]!;
}

function defaultStack(seed: number): string[] {
  const stacks = [
    ["WordPress", "Elementor"],
    ["Webflow", "Memberstack"],
    ["Next.js", "Vercel"],
    ["Shopify"],
    ["Framer"],
  ];
  return stacks[seed % stacks.length]!;
}
