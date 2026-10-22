import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import RestoreResidentButton from "@/components/RestoreResidentButton";
import { requireUser } from "@/lib/auth";
import { fmtDate, fullName, type Resident } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function ArchivedResidentsPage() {
  const { supabase } = await requireUser();
  const { data: residents } = await supabase.from("residents").select("*").not("discharge_date", "is", null).order("discharge_date", { ascending: false });

  return (
    <main className="min-h-screen flex flex-col max-w-lg mx-auto">
      <AppHeader title="Archived residents" subtitle="Discharged — kept readable for records" back="/residents" />
      <ul className="p-5 flex flex-col gap-2.5">
        {((residents ?? []) as Resident[]).map((r) => (
          <li key={r.id} className="bg-white border border-line rounded-2xl p-3.5 flex items-center gap-3">
            <Link href={`/residents/${r.id}`} className="flex-1 min-w-0">
              <div className="font-semibold">{fullName(r)}</div>
              <div className="text-xs text-muted">Discharged {fmtDate(r.discharge_date)}</div>
            </Link>
            <RestoreResidentButton residentId={r.id} />
          </li>
        ))}
        {(residents ?? []).length === 0 && <p className="text-sm text-muted">No discharged residents.</p>}
      </ul>
    </main>
  );
}
