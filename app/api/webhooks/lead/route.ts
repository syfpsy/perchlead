// POST /api/webhooks/lead
//
// Forward-looking capture endpoint. Validates the payload with Zod and is
// mode-aware via NEXT_PUBLIC_DATA_MODE:
//
//   - "neon" (production): inserts a lead into Postgres via the (future)
//     server-side service. Returns 201.
//   - "local" (default today): the data lives in each visitor's browser, so
//     a server route can't write to it. Returns 503 with a clear message.
//
// The schema is the contract — the route handler is intentionally tiny so
// when the Neon swap lands, only the persistence step changes.

import { NextResponse, type NextRequest } from "next/server";
import { normalizeWebhookPayload, webhookLeadSchema } from "@/lib/validators/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_MODE = process.env.NEXT_PUBLIC_DATA_MODE ?? "local";

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/webhooks/lead",
    method: "POST",
    expects: "application/json",
    schema: schemaSummary(),
    mode: DATA_MODE,
    note:
      DATA_MODE === "local"
        ? "Mock/local mode — the route validates payloads but cannot persist. Set NEXT_PUBLIC_DATA_MODE=neon and wire DATABASE_URL to enable."
        : "Live — POST a JSON payload to create a lead.",
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body must be JSON." },
      { status: 400 },
    );
  }

  const parsed = webhookLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Validation failed",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }

  const normalized = normalizeWebhookPayload(parsed.data);

  if (DATA_MODE !== "neon") {
    return NextResponse.json(
      {
        ok: false,
        error: "Webhook capture requires Neon mode.",
        mode: DATA_MODE,
        next_steps:
          "Set NEXT_PUBLIC_DATA_MODE=neon, configure DATABASE_URL on Vercel, apply db/schema.sql, and implement lib/store/neon-store.ts.",
        echoed: normalized,
      },
      { status: 503 },
    );
  }

  // When Neon is wired:
  //   const result = await createLeadServer(normalized);
  //   return NextResponse.json({ ok: true, lead: result.lead }, { status: 201 });
  return NextResponse.json(
    { ok: false, error: "Neon-backed createLead is not implemented yet." },
    { status: 501 },
  );
}

function schemaSummary() {
  return {
    required_one_of: ["name", "email", "first_name+last_name", "full_name"],
    fields: [
      "name | full_name | first_name + last_name",
      "email",
      "phone",
      "title",
      "company | organization | company_name",
      "website | url",
      "linkedin_url",
      "location",
      "notes",
      "source",
      "consent_basis",
      "metadata (object)",
    ],
  };
}
