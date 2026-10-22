import Link from "next/link";
import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import CarePlanSections from "@/components/CarePlanSections";
import DischargeResidentButton from "@/components/DischargeResidentButton";
import { requireUser } from "@/lib/auth";
import { fmtDate, fullName, loadPlan, reviewStatus } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function ResidentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string }> }) {
  const { id } = await params;
  const { s } = await searchParams;
  const { supabase, profile, user } = await requireUser();
  const plan = await loadPlan(supabase, id);
  if (!plan) notFound();
  const status = reviewStatus(plan.lastReview, plan.resident.original_plan_date);

  // HIPAA requires an audit trail of reads as well as writes — change_log already covers
  // writes; this covers "who looked at this resident's plan, and when."
  await supabase.from("access_log").insert({ resident_id: id, user_id: user.id, action: "view_plan" });

  const { data: log } = await supabase
    .from("change_log")
    .select("*, author:profiles!change_log_author_id_fkey(full_name,role)")
    .eq("resident_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen flex flex-col max-w-3xl mx-auto">
      <AppHeader
        title={fullName(plan.resident)}
        subtitle="Negotiated Care Plan · DSHS form"
        back="/residents"
        right={
          <Link href={`/residents/${id}/review`} className={`text-xs font-semibold px-2.5 py-2 rounded-full whitespace-nowrap ${status.tone === "bad" ? "bg-red-100 text-red-800" : status.tone === "warn" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
            Review {status.days <= 0 ? "due" : `in ${status.days}d`}
          </Link>
        }
      />
      <div className="no-print bg-white border-b border-line px-5 py-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span>
          <strong className="text-ink">Last updated</strong> {fmtDate(plan.lastUpdated)}
        </span>
        <span>
          <strong className="text-ink">Last reviewed</strong> {fmtDate(plan.lastReview?.reviewed_at)}
        </span>
        <span>
          <strong className="text-ink">Next due</strong> {fmtDate(status.due.toISOString())}
        </span>
        <span>
          <strong className="text-ink">v</strong>
          {plan.version}
        </span>
        <span className="ml-auto flex items-center gap-3">
          <Link href={`/residents/${id}/notes`} className="text-navy font-semibold">
            Daily notes
          </Link>
          <Link href={`/residents/${id}/log`} className="text-navy font-semibold">
            Change log
          </Link>
          <Link href={`/residents/${id}/print`} className="text-navy font-semibold">
            Print
          </Link>
          <DischargeResidentButton residentId={id} residentName={fullName(plan.resident)} />
        </span>
      </div>

      <CarePlanSections residentId={id} values={plan.values} log={(log ?? []) as never} initialSection={s} canEdit={!!profile} />
    </main>
  );
}
