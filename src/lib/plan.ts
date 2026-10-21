import type { SupabaseClient } from "@supabase/supabase-js";
import { NCP_TEMPLATE } from "./ncp-template";

export const REVIEW_INTERVAL_DAYS = 14;

export interface Resident {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  admit_date: string | null;
  original_plan_date: string | null;
  discharge_date: string | null;
}

export interface Profile {
  id: string;
  full_name: string;
  role: "admin" | "caregiver";
  home_id: string;
}

export interface FieldValue {
  field_id: string;
  value: string | null;
  version: number;
  effective_from: string;
  effective_to: string | null;
  reason: string | null;
}

export interface ChangeLogRow {
  id: string;
  field_id: string;
  old_value: string | null;
  new_value: string | null;
  author_id: string | null;
  confirmed_by: string | null;
  voice_note_id: string | null;
  reason: string | null;
  significant: boolean;
  plan_version: number;
  created_at: string;
  author?: { full_name: string; role: string } | null;
}

export interface Review {
  id: string;
  reviewed_at: string;
  plan_version: number;
  changes_count: number;
  significant_count: number;
  reviewer?: { full_name: string } | null;
}

export interface PlanSnapshot {
  resident: Resident;
  version: number;
  values: Record<string, FieldValue>;
  lastReview: Review | null;
  lastUpdated: string | null;
  changesSinceReview: ChangeLogRow[];
}

export function fullName(r: Pick<Resident, "first_name" | "last_name">) {
  return `${r.first_name} ${r.last_name}`.trim();
}

export function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d;
}

export function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}
export function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function reviewStatus(lastReview: Review | null, originalPlanDate: string | null) {
  const base = lastReview?.reviewed_at ?? originalPlanDate ?? new Date().toISOString();
  const due = addDays(base, REVIEW_INTERVAL_DAYS);
  const days = Math.ceil((due.getTime() - Date.now()) / 86400000);
  const label = days < 0 ? `${-days} day${days === -1 ? "" : "s"} overdue` : days === 0 ? "Due today" : `${days} day${days === 1 ? "" : "s"}`;
  const tone: "ok" | "warn" | "bad" = days < 0 ? "bad" : days <= 2 ? "warn" : "ok";
  return { due, days, label, tone };
}

export async function loadPlan(supabase: SupabaseClient, residentId: string): Promise<PlanSnapshot | null> {
  const { data: resident } = await supabase.from("residents").select("*").eq("id", residentId).single();
  if (!resident) return null;

  const [{ data: values }, { data: pv }, { data: reviews }] = await Promise.all([
    supabase.from("field_values").select("field_id,value,version,effective_from,effective_to,reason").eq("resident_id", residentId).is("effective_to", null),
    supabase.from("plan_versions").select("version").eq("resident_id", residentId).maybeSingle(),
    supabase.from("reviews").select("id,reviewed_at,plan_version,changes_count,significant_count,reviewer:profiles!reviews_reviewer_id_fkey(full_name)").eq("resident_id", residentId).order("reviewed_at", { ascending: false }).limit(1),
  ]);
  const lastReview = (reviews?.[0] as unknown as Review) ?? null;
  const since = lastReview?.reviewed_at ?? "1970-01-01";
  const { data: changes } = await supabase
    .from("change_log")
    .select("*, author:profiles!change_log_author_id_fkey(full_name,role)")
    .eq("resident_id", residentId)
    .gt("created_at", since)
    .order("created_at", { ascending: false });

  const map: Record<string, FieldValue> = {};
  let lastUpdated: string | null = null;
  for (const v of (values ?? []) as FieldValue[]) {
    map[v.field_id] = v;
    if (!lastUpdated || v.effective_from > lastUpdated) lastUpdated = v.effective_from;
  }
  return {
    resident: resident as Resident,
    version: pv?.version ?? 1,
    values: map,
    lastReview,
    lastUpdated,
    changesSinceReview: (changes ?? []) as ChangeLogRow[],
  };
}

/** Plain-text rendering of the current plan, for the AI mapping prompt. */
export function planAsText(values: Record<string, FieldValue>) {
  const lines: string[] = [];
  for (const s of NCP_TEMPLATE) {
    lines.push(`## ${s.title} (section id: ${s.id})`);
    for (const f of s.fields) {
      const v = values[f.id]?.value;
      lines.push(`- ${f.id} [${f.label}]: ${v ?? "(blank)"}`);
    }
  }
  return lines.join("\n");
}
