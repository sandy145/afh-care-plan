import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { requireUser } from "@/lib/auth";
import { fmtDateTime, fullName, type ChangeLogRow } from "@/lib/plan";
import { NCP_TEMPLATE, ASSIST_LABELS } from "@/lib/ncp-template";

export const dynamic = "force-dynamic";

export default async function LogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: resident } = await supabase.from("residents").select("first_name,last_name").eq("id", id).single();
  if (!resident) notFound();
  const { data: log } = await supabase.from("change_log").select("*, author:profiles!change_log_author_id_fkey(full_name,role)").eq("resident_id", id).order("created_at", { ascending: false });
  const { data: reviews } = await supabase.from("reviews").select("reviewed_at,plan_version,changes_count,reviewer:profiles!reviews_reviewer_id_fkey(full_name)").eq("resident_id", id).order("reviewed_at", { ascending: false });
  const show = (fid: string, v: string | null) => (v == null ? "(blank)" : fid.endsWith(".level") ? ASSIST_LABELS[v] ?? v : v);

  return (
    <main className="min-h-screen flex flex-col max-w-2xl mx-auto">
      <AppHeader title="Change log" subtitle={fullName(resident)} back={`/residents/${id}`} />
      <div className="p-5 flex flex-col gap-4">
        {(reviews ?? []).length > 0 && (
          <div className="bg-white border border-line rounded-xl p-3 text-xs flex flex-col gap-1">
            <div className="font-semibold uppercase text-muted">Reviews</div>
            {(reviews ?? []).map((r, i) => (
              <div key={i}>
                {fmtDateTime(r.reviewed_at)} · v{r.plan_version} · {r.changes_count} changes · {(r.reviewer as unknown as { full_name: string } | null)?.full_name}
              </div>
            ))}
          </div>
        )}
        <div className="bg-white border border-line rounded-2xl divide-y divide-gray-100">
          {((log ?? []) as ChangeLogRow[]).map((c) => (
            <div key={c.id} className="p-3 text-sm flex flex-col gap-0.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-navy">
                  {NCP_TEMPLATE.find((s) => s.id === c.field_id.split(".")[0])?.title} · {c.field_id.split(".")[1].replace(/_/g, " ")}
                </span>
                <span className="text-muted">v{c.plan_version}</span>
              </div>
              <div>
                <s className="text-red-800">{show(c.field_id, c.old_value)}</s> → <strong>{show(c.field_id, c.new_value)}</strong>
              </div>
              <div className="text-xs text-muted">
                {fmtDateTime(c.created_at)} · {c.author?.full_name} ({c.author?.role}){c.voice_note_id ? " · voice note" : " · by hand"}
                {c.reason ? ` · ${c.reason}` : ""}
                {c.significant ? " · significant" : ""}
              </div>
            </div>
          ))}
          {(log ?? []).length === 0 && <div className="p-3 text-sm text-muted">No changes yet.</div>}
        </div>
      </div>
    </main>
  );
}
