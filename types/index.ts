// Core domain types for Perchlead.
// Mirrors the Neon Postgres schema in /db/schema.sql.

export type ID = string;
export type ISODate = string;

export type LeadStatus =
  | "new"
  | "cleaned"
  | "enriched"
  | "qualified"
  | "contacted"
  | "replied"
  | "converted"
  | "rejected"
  | "do_not_contact";

export type SourceType =
  | "csv"
  | "paste"
  | "manual"
  | "webhook"
  | "google_sheets"
  | "gumroad"
  | "lemon_squeezy"
  | "paddle"
  | "appsumo"
  | "hubspot"
  | "smartlead"
  | "instantly"
  | "lead_finder"
  | "other";

export type InterestLevel = "low" | "medium" | "high";

export type ConsentBasis =
  | "user_provided"
  | "purchase"
  | "newsletter_signup"
  | "form_submission"
  | "manual_entry"
  | "public_directory"
  | "unknown";

export interface User {
  id: ID;
  email: string;
  full_name: string;
  created_at: ISODate;
}

export interface Source {
  id: ID;
  owner_id: ID;
  type: SourceType;
  name: string;
  imported_at: ISODate;
  raw_payload_json?: Record<string, unknown> | null;
  confidence: number; // 0..1
  created_at: ISODate;
}

export interface Company {
  id: ID;
  owner_id: ID;
  name: string;
  domain?: string | null;
  website?: string | null;
  industry?: string | null;
  size?: string | null;
  location?: string | null;
  description?: string | null;
  quality_score?: number | null;
  tech_stack?: string[] | null;
  social_links_json?: Record<string, string> | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface Product {
  id: ID;
  owner_id: ID;
  name: string;
  description?: string | null;
  url?: string | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface LeadProductInterest {
  id: ID;
  lead_id: ID;
  product_id: ID;
  interest_level: InterestLevel;
  confidence: number; // 0..1
  reason?: string | null;
  source?: string | null;
  created_at: ISODate;
}

export interface Tag {
  id: ID;
  owner_id: ID;
  name: string;
  color: string;
  created_at: ISODate;
}

export interface Interaction {
  id: ID;
  owner_id: ID;
  lead_id: ID;
  type: "note" | "email" | "call" | "meeting" | "import" | "merge" | "system";
  note?: string | null;
  happened_at: ISODate;
  created_at: ISODate;
}

export interface Task {
  id: ID;
  owner_id: ID;
  lead_id: ID;
  title: string;
  due_date?: ISODate | null;
  status: "open" | "done" | "snoozed";
  created_at: ISODate;
  updated_at: ISODate;
}

export interface ScoreReason {
  signal: string;
  delta: number;
  detail?: string;
}

export interface ScoreResult {
  score: number;
  reasons: ScoreReason[];
  warnings: string[];
  next_action: string;
}

export interface Lead {
  id: ID;
  owner_id: ID;
  name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  company_id?: ID | null;
  website?: string | null;
  linkedin_url?: string | null;
  location?: string | null;
  status: LeadStatus;
  score: number;
  score_reason?: ScoreResult | null;
  source_id?: ID | null;
  consent_basis?: ConsentBasis | null;
  is_suppressed: boolean;
  notes?: string | null;
  tag_ids: ID[];
  created_at: ISODate;
  updated_at: ISODate;
}

export interface SavedList {
  id: ID;
  owner_id: ID;
  name: string;
  filters_json: LeadFilters;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface LeadFilters {
  query?: string;
  statuses?: LeadStatus[];
  tag_ids?: ID[];
  product_ids?: ID[];
  source_types?: SourceType[];
  score_min?: number;
  score_max?: number;
  created_after?: ISODate;
  created_before?: ISODate;
  is_suppressed?: boolean;
  has_email?: boolean;
  has_company?: boolean;
}

export interface Suppression {
  id: ID;
  owner_id: ID;
  email?: string | null;
  domain?: string | null;
  reason?: string | null;
  created_at: ISODate;
}

export interface AuditLog {
  id: ID;
  owner_id: ID;
  entity_type: "lead" | "company" | "import" | "list" | "suppression" | "product" | "tag" | "task";
  entity_id: ID;
  action:
    | "create"
    | "update"
    | "delete"
    | "merge"
    | "import"
    | "export"
    | "suppress"
    | "unsuppress"
    | "score";
  metadata_json?: Record<string, unknown> | null;
  created_at: ISODate;
}

export interface ImportRecord {
  id: ID;
  owner_id: ID;
  filename: string;
  source_type: SourceType;
  status: "pending" | "mapping" | "previewing" | "completed" | "failed";
  total_rows: number;
  imported_count: number;
  duplicate_count: number;
  error_count: number;
  mapping_json: ColumnMapping;
  created_at: ISODate;
}

export interface ImportRow {
  id: ID;
  import_id: ID;
  raw_json: Record<string, string>;
  normalized_json?: Partial<Lead> & { _company_name?: string; _domain?: string };
  status: "pending" | "imported" | "duplicate" | "error";
  error?: string | null;
  duplicate_of?: ID | null;
  created_at: ISODate;
}

export type ColumnMapping = Partial<{
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  company: string;
  website: string;
  phone: string;
  title: string;
  source: string;
  linkedin_url: string;
  location: string;
  notes: string;
}>;

export interface EmailTemplate {
  id: ID;
  label: string;
  description: string;
  subject: string;
  body: string;
  /** Hint shown in the draft modal describing ideal use cases. */
  recommendedFor?: string;
  /** Populated for custom templates stored in the snapshot; absent for built-ins. */
  created_at?: ISODate;
  updated_at?: ISODate;
}

// Top-level shape of the in-memory data store. Mirrors the Neon schema.
export interface DataSnapshot {
  schema_version: 1;
  current_user: User;
  users: User[];
  leads: Lead[];
  companies: Company[];
  sources: Source[];
  products: Product[];
  product_interests: LeadProductInterest[];
  tags: Tag[];
  interactions: Interaction[];
  tasks: Task[];
  lists: SavedList[];
  suppressions: Suppression[];
  audit_logs: AuditLog[];
  imports: ImportRecord[];
  import_rows: ImportRow[];
  /** Custom email templates. Merged with the built-in TEMPLATES in the draft modal. */
  email_templates?: EmailTemplate[];
}

// Aggregated row type the inbox table renders.
export interface LeadRow {
  lead: Lead;
  company?: Company | null;
  source?: Source | null;
  tags: Tag[];
  interests: Array<{ product: Product; interest: LeadProductInterest }>;
  last_interaction_at?: ISODate | null;
  next_action: string;
}
