import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { requireUser } from "@/lib/auth";
import { fmtDate, fullName, reviewStatus, type Resident, type Review } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function ResidentsPage() {
  const { supabase, profile } = await requireUser();
  const { data: residents } = await supabase.from("residents").select("*").is("discharge_date", null).order("last_name");
  const ids = (residents ?? []).map((r) => r.id);

  const [{ data: reviews }, { data: latest }, { data: home }] = await Promise.all([
    supabase.from("reviews").select("id,resident_id,reviewed_at,plan_version,changes_count,significant_count").in("resident_id", ids).order("reviewed_at", { ascending: false }),
    supabase.from("change_log").select("resident_id,created_at,field_id,new_value").in("resident_id", ids).order("created_at", { ascending: false }).limit(200),
    supabase.from("homes").select("name").eq("id", profile?.home_id ?? "").maybeSingle(),
  ]);

  const lastReviewFor: Record<string, Review> = {};
  for (const r of reviews ?? []) if (!lastReviewFor[r.resident_id]) lastReviewFor[r.resident_id] = r as Review;
  const lastChangeFor: Record<string, { created_at: string; field_id: string }> = {};
  for (const c of latest ?? []) if (!lastChangeFor[c.resident_id]) lastChangeFor[c.resident_id] = c;

  const rows = ((residents ?? []) as Resident[]).map((r) => ({ r, status: reviewStatus(lastReviewFor[r.id] ?? null, r.original_plan_date), last: lastChangeFor[r.id] }));
  const due = rows.filter((x) => x.status.days <= 0);

  return (
    <main className="min-h-screen flex flex-col max-w-lg mx-auto">
      <AppHeader title="Residents" subtitle={`${home?.name ?? "Adult Family Home"} · ${rows.length} residents`} who={profile} />

      {due.length > 0 && (
        <div className="mx-5 mt-4 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
          <strong>{due.length} review{due.length > 1 ? "s" : ""} due.</strong> {due.map((x) => `${fullName(x.r)} (${x.status.label.toLowerCase()})`).join("; ")}.
        </div>
      )}

      <ul className="p-5 flex flex-col gap-2.5">
        {rows.map(({ r, status, last }) => (
          <li key={r.id}>
            <Link href={`/residents/${r.id}`} className="bg-white border border-line rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-100 text-navy font-bold flex items-center justify-center">
                {r.first_name[0]}
                {r.last_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{fullName(r)}</div>
                <div className="text-xs text-muted truncate">
                  {last ? `Updated ${fmtDate(last.created_at)} · ${last.field_id.split(".")[0].replace(/_/g, " ")}` : lastReviewFor[r.id] ? `Reviewed ${fmtDate(lastReviewFor[r.id].reviewed_at)}` : "Plan not started"}
                </div>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${status.tone === "bad" ? "bg-red-100 text-red-800" : status.tone === "warn" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>{status.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="px-5 flex flex-col gap-3">
        <Link href="/residents/new" className="h-12 rounded-xl bg-navy text-white font-semibold flex items-center justify-center">
          + Add resident
        </Link>
        <p className="text-xs text-muted">Badge = time until the 14-day review is due.</p>
        <Link href="/residents/archived" className="text-xs text-navy font-semibold self-start">
          Discharged / archived residents →
        </Link>
      </div>
    </main>
  );
}
