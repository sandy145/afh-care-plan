import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { requireUser } from "@/lib/auth";
import { fmtDateTime, fullName } from "@/lib/plan";

export const dynamic = "force-dynamic";

interface DailyNoteRow {
  id: string;
  text: string;
  created_at: string;
  author: { full_name: string } | null;
}

export default async function DailyNotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: resident } = await supabase.from("residents").select("first_name,last_name").eq("id", id).single();
  if (!resident) notFound();
  const { data: notes } = await supabase.from("daily_notes").select("id,text,created_at,author:profiles!daily_notes_author_id_fkey(full_name)").eq("resident_id", id).order("created_at", { ascending: false });

  return (
    <main className="min-h-screen flex flex-col max-w-2xl mx-auto">
      <AppHeader title="Daily notes" subtitle={fullName(resident)} back={`/residents/${id}`} />
      <div className="p-5 flex flex-col gap-4">
        <p className="text-xs text-muted">Observations from voice notes that didn&apos;t change the care plan (e.g. &quot;ate well today&quot;). These don&apos;t appear in the change log or on the printed plan.</p>
        <div className="bg-white border border-line rounded-2xl divide-y divide-gray-100">
          {((notes ?? []) as unknown as DailyNoteRow[]).map((n) => (
            <div key={n.id} className="p-3 text-sm flex flex-col gap-0.5">
              <div>{n.text}</div>
              <div className="text-xs text-muted">
                {fmtDateTime(n.created_at)} · {n.author?.full_name ?? "—"}
              </div>
            </div>
          ))}
          {(notes ?? []).length === 0 && <div className="p-3 text-sm text-muted">No daily notes yet.</div>}
        </div>
      </div>
    </main>
  );
}
