// Lead Finder provider. The MVP only ships a mock — real implementations
// would call Google Places, public-directory crawlers, or similar.
// The data model below is what the Finder UI consumes.

export interface LeadFinderQuery {
  query: string;
  location?: string;
  niche?: string;
  limit?: number;
}

export interface LeadFinderResult {
  id: string;
  name: string;
  company: string;
  website?: string;
  email?: string;
  location?: string;
  industry?: string;
  source: string;
  confidence: number;
  description?: string;
  tags?: string[];
}

export interface LeadFinderProvider {
  name: string;
  search(query: LeadFinderQuery): Promise<LeadFinderResult[]>;
}

const DEMO_TEMPLATES: Array<Omit<LeadFinderResult, "id" | "source" | "confidence">> = [
  {
    name: "Maya Pekar",
    company: "Studio Pekar",
    website: "https://studiopekar.de",
    email: "hello@studiopekar.de",
    location: "Berlin, DE",
    industry: "Animation studio",
    description: "Boutique 2D/3D animation studio for ad agencies.",
    tags: ["motion", "berlin"],
  },
  {
    name: "Daniel Aksoy",
    company: "Aksoy Lokantası",
    website: "https://aksoylokantasi.com",
    email: "info@aksoylokantasi.com",
    location: "Ataşehir, IST",
    industry: "Restaurant",
    description: "Family-run restaurant in Ataşehir.",
    tags: ["restaurant", "istanbul"],
  },
  {
    name: "Elif Korkmaz",
    company: "Pixelhouse Games",
    website: "https://pixelhousegames.com",
    email: "elif@pixelhousegames.com",
    location: "Istanbul, TR",
    industry: "Mobile game studio",
    description: "Indie mobile game studio hiring motion designers.",
    tags: ["games", "motion"],
  },
  {
    name: "Jonas Weiss",
    company: "Weiss Motion",
    website: "https://weiss-motion.com",
    email: "j@weiss-motion.com",
    location: "Berlin, DE",
    industry: "After Effects studio",
    description: "Animator that ships AE templates.",
    tags: ["after-effects", "templates"],
  },
  {
    name: "Aria Ng",
    company: "Loopworks",
    website: "https://loopworks.io",
    email: "aria@loopworks.io",
    location: "Singapore",
    industry: "Lottie animation shop",
    description: "Sells Lottie animation packs.",
    tags: ["lottie", "marketplace"],
  },
  {
    name: "Mateo Rivera",
    company: "Rivera & Co",
    website: "https://rivera.studio",
    email: "mateo@rivera.studio",
    location: "Madrid, ES",
    industry: "Branding agency",
    description: "Small branding studio with weak website performance.",
    tags: ["agency", "audit"],
  },
];

export const mockLeadFinderProvider: LeadFinderProvider = {
  name: "mock",
  async search(query) {
    await sleep(550);
    const limit = query.limit ?? 6;
    const filtered = DEMO_TEMPLATES.filter((tpl) => {
      const haystack = `${tpl.name} ${tpl.company} ${tpl.industry} ${tpl.location} ${tpl.tags?.join(" ")}`.toLowerCase();
      const q = (query.query ?? "").toLowerCase();
      const loc = (query.location ?? "").toLowerCase();
      const niche = (query.niche ?? "").toLowerCase();
      if (q && !haystack.includes(q.split(" ")[0]!)) return false;
      if (loc && !haystack.includes(loc)) return false;
      if (niche && !haystack.includes(niche.split(" ")[0]!)) return false;
      return true;
    });
    const base = filtered.length ? filtered : DEMO_TEMPLATES;
    return base.slice(0, limit).map<LeadFinderResult>((tpl, idx) => ({
      ...tpl,
      id: `lf_${idx}_${Date.now().toString(36)}`,
      source: "mock-finder",
      confidence: 0.55 - idx * 0.04,
    }));
  },
};

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}
