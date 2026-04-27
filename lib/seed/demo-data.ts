// Builds a rich demo dataset: products, tags, sources, companies, leads,
// product interests, interactions, and a couple of suppressions.
//
// Imported by data-store on first load. Keeping it in TS instead of JSON
// keeps the demo "alive" — every fresh boot has fresh `created_at`s.

import type {
  Company,
  DataSnapshot,
  Interaction,
  Lead,
  LeadProductInterest,
  Product,
  Source,
  Suppression,
  Tag,
  Task,
} from "@/types";
import { nid } from "@/lib/utils/id";
import { scoreLead } from "@/lib/services/scoring-service";

export function buildSeed(base: DataSnapshot): DataSnapshot {
  const ownerId = base.current_user.id;
  const now = Date.now();
  const iso = (offsetDays: number) => new Date(now - offsetDays * 86400000).toISOString();

  const products: Product[] = [
    {
      id: "prod_lm",
      owner_id: ownerId,
      name: "Lead Manager",
      description: "This app — a calm lead inbox for indie founders.",
      url: "https://perchlead.app",
      created_at: iso(40),
      updated_at: iso(40),
    },
    {
      id: "prod_ae",
      owner_id: ownerId,
      name: "After Effects Extension",
      description: "Productivity extension for motion designers.",
      url: "https://example.com/ae-ext",
      created_at: iso(60),
      updated_at: iso(60),
    },
    {
      id: "prod_lottie",
      owner_id: ownerId,
      name: "Lottie Store",
      description: "Marketplace of Lottie animations.",
      url: "https://example.com/lottie",
      created_at: iso(120),
      updated_at: iso(120),
    },
    {
      id: "prod_audit",
      owner_id: ownerId,
      name: "Website Audit Tool",
      description: "One-click website performance + UX audit.",
      url: "https://example.com/audit",
      created_at: iso(80),
      updated_at: iso(80),
    },
    {
      id: "prod_compare",
      owner_id: ownerId,
      name: "SaaS Comparison Tool",
      description: "Compare SaaS tools side-by-side.",
      url: "https://example.com/compare",
      created_at: iso(150),
      updated_at: iso(150),
    },
  ];

  const tags: Tag[] = [
    { id: "tag_priority", owner_id: ownerId, name: "Priority", color: "#dc2626", created_at: iso(40) },
    { id: "tag_warm", owner_id: ownerId, name: "Warm", color: "#f59e0b", created_at: iso(40) },
    { id: "tag_motion", owner_id: ownerId, name: "Motion", color: "#7c3aed", created_at: iso(40) },
    { id: "tag_local", owner_id: ownerId, name: "Local Biz", color: "#10b981", created_at: iso(40) },
    { id: "tag_buyer", owner_id: ownerId, name: "Buyer", color: "#2752ec", created_at: iso(40) },
    { id: "tag_partner", owner_id: ownerId, name: "Partner", color: "#0ea5e9", created_at: iso(40) },
  ];

  const sources: Source[] = [
    src("src_csv1", "AppSumo Buyers Q1.csv", "appsumo", iso(8)),
    src("src_csv2", "Newsletter signups (May).csv", "csv", iso(15)),
    src("src_paste", "Pasted from Sheet — Berlin Studios", "paste", iso(3)),
    src("src_form", "Website signup form", "webhook", iso(2)),
    src("src_manual", "Manual entry", "manual", iso(20)),
    src("src_finder", "Lead Finder", "lead_finder", iso(1)),
  ];
  function src(id: string, name: string, type: Source["type"], at: string): Source {
    return {
      id,
      owner_id: ownerId,
      type,
      name,
      imported_at: at,
      raw_payload_json: null,
      confidence: type === "appsumo" || type === "manual" ? 0.95 : 0.8,
      created_at: at,
    };
  }

  const companies: Company[] = [
    co("co_pekar", "Studio Pekar", "studiopekar.de", "Berlin, DE", "Animation studio"),
    co("co_aksoy", "Aksoy Lokantası", "aksoylokantasi.com", "Ataşehir, IST", "Restaurant"),
    co("co_pixel", "Pixelhouse Games", "pixelhousegames.com", "Istanbul, TR", "Mobile game studio"),
    co("co_weiss", "Weiss Motion", "weiss-motion.com", "Berlin, DE", "After Effects studio"),
    co("co_loop", "Loopworks", "loopworks.io", "Singapore", "Lottie animation shop"),
    co("co_rivera", "Rivera & Co", "rivera.studio", "Madrid, ES", "Branding agency"),
    co("co_mosaic", "Mosaic Newsroom", "mosaicnews.co", "London, UK", "Independent media"),
    co("co_klima", "Klima Coffee", "klimacoffee.com", "Vienna, AT", "Local roastery"),
    co("co_vault", "Vault SaaS", "vault.dev", "Remote", "Developer tooling"),
    co("co_orchid", "Orchid Lab", "orchidlab.studio", "Lisbon, PT", "Design studio"),
  ];

  function co(id: string, name: string, domain: string, location: string, industry: string): Company {
    return {
      id,
      owner_id: ownerId,
      name,
      domain,
      website: `https://${domain}`,
      industry,
      size: null,
      location,
      description: null,
      quality_score: null,
      tech_stack: null,
      social_links_json: null,
      created_at: iso(30),
      updated_at: iso(7),
    };
  }

  const suppressions: Suppression[] = [
    {
      id: "sup_unsub_1",
      owner_id: ownerId,
      email: "unsubscribed@example.com",
      domain: null,
      reason: "Unsubscribed via newsletter footer",
      created_at: iso(30),
    },
  ];

  type DraftLead = {
    id: string;
    name: string;
    email?: string;
    title?: string;
    companyId?: string;
    website?: string;
    linkedin?: string;
    location?: string;
    sourceId: string;
    status?: Lead["status"];
    consent: Lead["consent_basis"];
    suppressed?: boolean;
    notes?: string;
    tagIds?: string[];
    interests?: Array<{
      productId: string;
      level: LeadProductInterest["interest_level"];
      reason: string;
    }>;
    createdDaysAgo: number;
  };

  const drafts: DraftLead[] = [
    {
      id: "lead_1",
      name: "Maya Pekar",
      email: "maya@studiopekar.de",
      title: "Founder",
      companyId: "co_pekar",
      website: "https://studiopekar.de",
      linkedin: "https://linkedin.com/in/mayapekar",
      location: "Berlin, DE",
      sourceId: "src_form",
      status: "qualified",
      consent: "form_submission",
      tagIds: ["tag_priority", "tag_motion"],
      interests: [
        { productId: "prod_ae", level: "high", reason: "Asked about AE templates on Twitter" },
        { productId: "prod_lottie", level: "medium", reason: "Mentioned Lottie need" },
      ],
      notes: "Wants a templating workflow for repeating client jobs.",
      createdDaysAgo: 2,
    },
    {
      id: "lead_2",
      name: "Daniel Aksoy",
      email: "info@aksoylokantasi.com",
      title: "Owner",
      companyId: "co_aksoy",
      website: "https://aksoylokantasi.com",
      location: "Ataşehir, IST",
      sourceId: "src_finder",
      status: "new",
      consent: "public_directory",
      tagIds: ["tag_local"],
      interests: [
        {
          productId: "prod_audit",
          level: "high",
          reason: "Site loads slowly, weak SEO — likely audit fit",
        },
      ],
      notes: "Restaurant with a basic site. Could use a website audit.",
      createdDaysAgo: 1,
    },
    {
      id: "lead_3",
      name: "Elif Korkmaz",
      email: "elif@pixelhousegames.com",
      title: "Producer",
      companyId: "co_pixel",
      website: "https://pixelhousegames.com",
      linkedin: "https://linkedin.com/in/elifkorkmaz",
      location: "Istanbul, TR",
      sourceId: "src_csv1",
      status: "contacted",
      consent: "purchase",
      tagIds: ["tag_warm", "tag_motion", "tag_buyer"],
      interests: [
        { productId: "prod_ae", level: "high", reason: "Studio uses AE daily" },
        { productId: "prod_lm", level: "medium", reason: "Manages many publisher leads" },
      ],
      notes: "Bought AppSumo deal — onboarded last week.",
      createdDaysAgo: 8,
    },
    {
      id: "lead_4",
      name: "Jonas Weiss",
      email: "j@weiss-motion.com",
      title: "Animator",
      companyId: "co_weiss",
      website: "https://weiss-motion.com",
      linkedin: "https://linkedin.com/in/jonasweiss",
      location: "Berlin, DE",
      sourceId: "src_csv2",
      status: "replied",
      consent: "newsletter_signup",
      tagIds: ["tag_motion", "tag_partner"],
      interests: [
        { productId: "prod_ae", level: "high", reason: "Sells AE templates already" },
      ],
      createdDaysAgo: 14,
    },
    {
      id: "lead_5",
      name: "Aria Ng",
      email: "aria@loopworks.io",
      title: "Founder",
      companyId: "co_loop",
      website: "https://loopworks.io",
      linkedin: "https://linkedin.com/in/aria-ng",
      location: "Singapore",
      sourceId: "src_finder",
      status: "new",
      consent: "public_directory",
      tagIds: ["tag_motion"],
      interests: [
        { productId: "prod_lottie", level: "high", reason: "Runs a Lottie shop — overlapping ICP" },
      ],
      createdDaysAgo: 1,
    },
    {
      id: "lead_6",
      name: "Mateo Rivera",
      email: "mateo@rivera.studio",
      title: "Designer",
      companyId: "co_rivera",
      website: "https://rivera.studio",
      location: "Madrid, ES",
      sourceId: "src_paste",
      status: "new",
      consent: "manual_entry",
      tagIds: ["tag_warm"],
      interests: [
        { productId: "prod_audit", level: "medium", reason: "Site has heavy hero video" },
      ],
      createdDaysAgo: 3,
    },
    {
      id: "lead_7",
      name: "Sara Holm",
      email: "sara@mosaicnews.co",
      title: "Editor",
      companyId: "co_mosaic",
      website: "https://mosaicnews.co",
      location: "London, UK",
      sourceId: "src_csv2",
      status: "qualified",
      consent: "newsletter_signup",
      tagIds: ["tag_priority"],
      interests: [
        { productId: "prod_lm", level: "high", reason: "Asked for a tool to manage source leads" },
      ],
      createdDaysAgo: 6,
    },
    {
      id: "lead_8",
      name: "Felix Adler",
      email: "felix@klimacoffee.com",
      title: "Owner",
      companyId: "co_klima",
      website: "https://klimacoffee.com",
      location: "Vienna, AT",
      sourceId: "src_finder",
      status: "new",
      consent: "public_directory",
      tagIds: ["tag_local"],
      interests: [
        { productId: "prod_audit", level: "low", reason: "Mostly Instagram-driven" },
      ],
      createdDaysAgo: 1,
    },
    {
      id: "lead_9",
      name: "Priya Patel",
      email: "priya@vault.dev",
      title: "Co-founder",
      companyId: "co_vault",
      website: "https://vault.dev",
      linkedin: "https://linkedin.com/in/priya-patel",
      location: "Remote",
      sourceId: "src_csv1",
      status: "contacted",
      consent: "purchase",
      tagIds: ["tag_buyer", "tag_partner"],
      interests: [
        { productId: "prod_compare", level: "high", reason: "Wants to be listed for comparison" },
        { productId: "prod_lm", level: "medium", reason: "Could refer their audience" },
      ],
      createdDaysAgo: 9,
    },
    {
      id: "lead_10",
      name: "Lucas Orchid",
      email: "lucas@orchidlab.studio",
      title: "Creative Director",
      companyId: "co_orchid",
      website: "https://orchidlab.studio",
      location: "Lisbon, PT",
      sourceId: "src_paste",
      status: "new",
      consent: "manual_entry",
      tagIds: ["tag_motion"],
      interests: [
        { productId: "prod_ae", level: "medium", reason: "Studio works in AE" },
        { productId: "prod_lottie", level: "low", reason: "Occasionally uses Lottie" },
      ],
      createdDaysAgo: 4,
    },
    {
      id: "lead_11",
      name: "Anonymous Test",
      email: "unsubscribed@example.com",
      sourceId: "src_csv2",
      status: "do_not_contact",
      consent: "newsletter_signup",
      suppressed: true,
      tagIds: [],
      interests: [],
      notes: "On suppression list.",
      createdDaysAgo: 28,
    },
    {
      id: "lead_12",
      name: "Hadley Lee",
      title: "Indie hacker",
      sourceId: "src_manual",
      status: "new",
      consent: "manual_entry",
      tagIds: [],
      interests: [
        { productId: "prod_lm", level: "low", reason: "Saw on IndieHackers" },
      ],
      notes: "Met at a meetup, no email yet.",
      createdDaysAgo: 12,
    },
  ];

  const leads: Lead[] = [];
  const interests: LeadProductInterest[] = [];
  for (const d of drafts) {
    const lead: Lead = {
      id: d.id,
      owner_id: ownerId,
      name: d.name,
      email: d.email ?? null,
      phone: null,
      title: d.title ?? null,
      company_id: d.companyId ?? null,
      website: d.website ?? null,
      linkedin_url: d.linkedin ?? null,
      location: d.location ?? null,
      status: d.status ?? "new",
      score: 0,
      score_reason: null,
      source_id: d.sourceId,
      consent_basis: d.consent,
      is_suppressed: d.suppressed ?? false,
      notes: d.notes ?? null,
      tag_ids: d.tagIds ?? [],
      created_at: iso(d.createdDaysAgo),
      updated_at: iso(Math.max(0, d.createdDaysAgo - 1)),
    };
    for (const pi of d.interests ?? []) {
      interests.push({
        id: nid("int"),
        lead_id: d.id,
        product_id: pi.productId,
        interest_level: pi.level,
        confidence: 0.8,
        reason: pi.reason,
        source: "seed",
        created_at: iso(d.createdDaysAgo),
      });
    }
    leads.push(lead);
  }

  // Score after we know everything.
  for (const lead of leads) {
    const company = companies.find((c) => c.id === lead.company_id);
    const source = sources.find((s) => s.id === lead.source_id);
    const ints = interests.filter((p) => p.lead_id === lead.id);
    const result = scoreLead({ lead, company, source, interests: ints });
    lead.score = result.score;
    lead.score_reason = result;
  }

  const interactions: Interaction[] = leads.flatMap((lead) => {
    const arr: Interaction[] = [
      {
        id: nid("itx"),
        owner_id: ownerId,
        lead_id: lead.id,
        type: "import",
        note: "Created from seed data.",
        happened_at: lead.created_at,
        created_at: lead.created_at,
      },
    ];
    if (lead.status === "contacted" || lead.status === "replied") {
      arr.push({
        id: nid("itx"),
        owner_id: ownerId,
        lead_id: lead.id,
        type: "email",
        note: "Sent intro email.",
        happened_at: lead.updated_at,
        created_at: lead.updated_at,
      });
    }
    return arr;
  });

  const tasks: Task[] = [
    {
      id: "task_1",
      owner_id: ownerId,
      lead_id: "lead_1",
      title: "Reply with the AE template demo loom",
      due_date: iso(-1), // tomorrow
      status: "open",
      created_at: iso(2),
      updated_at: iso(2),
    },
    {
      id: "task_2",
      owner_id: ownerId,
      lead_id: "lead_2",
      title: "Run a website audit and email the report",
      due_date: iso(2), // 2 days ago = overdue
      status: "open",
      created_at: iso(1),
      updated_at: iso(1),
    },
    {
      id: "task_3",
      owner_id: ownerId,
      lead_id: "lead_3",
      title: "Onboarding call follow-up",
      due_date: iso(-3),
      status: "open",
      created_at: iso(5),
      updated_at: iso(5),
    },
    {
      id: "task_4",
      owner_id: ownerId,
      lead_id: "lead_4",
      title: "Send partnership pitch",
      due_date: null,
      status: "done",
      created_at: iso(7),
      updated_at: iso(2),
    },
  ];

  return {
    ...base,
    products,
    tags,
    sources,
    companies,
    leads,
    product_interests: interests,
    interactions,
    tasks,
    suppressions,
    lists: [
      {
        id: "list_high_priority",
        owner_id: ownerId,
        name: "High-priority leads",
        filters_json: { score_min: 70, statuses: ["new", "qualified", "contacted", "replied"] },
        created_at: iso(20),
        updated_at: iso(2),
      },
      {
        id: "list_motion_studios",
        owner_id: ownerId,
        name: "Motion studios",
        filters_json: { tag_ids: ["tag_motion"] },
        created_at: iso(20),
        updated_at: iso(2),
      },
      {
        id: "list_needs_email",
        owner_id: ownerId,
        name: "Needs email",
        filters_json: { has_email: false, is_suppressed: false },
        created_at: iso(20),
        updated_at: iso(2),
      },
    ],
  };
}
