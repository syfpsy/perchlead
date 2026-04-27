"use client";

import { useSyncExternalStore } from "react";
import { store, type DataSnapshot } from "./data-store";

const serverSnapshot: DataSnapshot = {
  schema_version: 1,
  current_user: {
    id: "user_demo",
    email: "demo@perchlead.app",
    full_name: "Demo Founder",
    created_at: new Date(0).toISOString(),
  },
  users: [],
  leads: [],
  companies: [],
  sources: [],
  products: [],
  product_interests: [],
  tags: [],
  interactions: [],
  tasks: [],
  lists: [],
  suppressions: [],
  audit_logs: [],
  imports: [],
  import_rows: [],
};

export function useSnapshot(): DataSnapshot {
  return useSyncExternalStore(
    store.subscribe,
    () => store.get(),
    () => serverSnapshot,
  );
}
