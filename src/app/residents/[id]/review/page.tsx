import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import CompleteReview from "@/components/CompleteReview";
import { requireUser } from "@/lib/auth";
import { addDays, fmtDate, fmtDateTime, fullName, loadPlan, REVIEW_INTERVAL_DAYS } from "@/lib/plan";
import { NCP_TEMPLATE, ASSIST_LABELS } from "@/lib/ncp-template";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireUser();
  const plan = await loadPlan(supabase, id);
  if (!plan) notFound();
  const changes = plan.changesSinceReview;
  const changedSections = new Set(changes.map((c) => c.field_id.split(".")[0]));
  const unchanged = NCP_TEMPLATE.filter((s) => !changedSections.has(s.id)).map((s) => s.title);
  const since = plan.lastReview?.reviewed_at ?? plan.resident.original_plan_date;
  const show = (fid: string, v: string | null) => (v == null ? "(blank)" : fid.endsWith(".level") ? ASSIST_LABELS[v] ?? v : v);

  return (
    <main className="min-h-screen flex flex-col max-w-lg mx-auto pb-40">
      <AppHeader title="2-week review" subtitle={`${fullName(plan.resident)} · ${fmtDate(since)} – ${fmtDate(new Date().toISOString())}`} back={`/residents/${id}`} />
      <div className="p-5 flex flex-col gap-4">
        <div className="flex gap-2.5">
          <div className="flex-1 bg-white border border-line rounded-xl p-3">
            <div className="text-[11px] text-muted font-semibold uppercase">Last reviewed</div>
            <div className="font-semibold">{fmtDate(plan.lastReview?.reviewed_at)}</div>
            <div className="text-xs text-muted">{plan.lastReview?.reviewer?.full_name ? `by ${plan.lastReview.reviewer.full_name}` : "no review yet"}</div>
          </div>
          <div className="flex-1 bg-white border border-line rounded-xl p-3">
            <div className="text-[11px] text-muted font-semibold uppercase">Changes since</div>
            <div className="font-semibold">{changes.length} changes</div>
            <div className="text-xs text-red-800">{changes.filter((c) => c.significant).length} significant</div>
          </div>
        </div>

        <div className="text-sm font-semibold">What changed</div>
        <div className="bg-white border border-line rounded-2xl divide-y divide-gray-100">
          {changes.length === 0 && <div className="p-3 text-sm text-muted">No changes since the last review.</div>}
          {changes.map((c) => (
            <div key={c.id} className="p-3 flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-navy">
                  {NCP_TEMPLATE.find((s) => s.id === c.field_id.split(".")[0])?.title} · {fieldLabel(c.field_id)}
                </span>
                <span className="text-muted">
                  {fmtDateTime(c.created_at)} · {c.author?.full_name}
                </span>
              </div>
              <div className="text-sm">
                <s className="text-red-800">{show(c.field_id, c.old_value)}</s> → <strong>{show(c.field_id, c.new_value)}</strong>
              </div>
              {c.reason && <div className="text-xs text-muted">Reason: {c.reason}</div>}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted">No change: {unchanged.join(" · ")}.</p>

        <CompleteReview residentId={id} reviewerName={profile?.full_name ?? ""} residentName={fullName(plan.resident)} nextDue={fmtDate(addDays(new Date().toISOString(), REVIEW_INTERVAL_DAYS).toISOString())} />
      </div>
    </main>
  );
}

function fieldLabel(fid: string) {
  for (const s of NCP_TEMPLATE) for (const f of s.fields) if (f.id === fid) return f.column === 1 ? f.label : f.column === 2 ? "Strengths" : "Caregiver will";
  return fid;
}
