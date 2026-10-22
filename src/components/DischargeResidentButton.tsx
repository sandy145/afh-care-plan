"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DischargeResidentButton({ residentId, residentName }: { residentId: string; residentName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function discharge() {
    if (!confirm(`Discharge ${residentName}? Their plan stays readable under Archived residents, but drops off the active list.`)) return;
    setBusy(true);
    const res = await fetch(`/api/residents/${residentId}/discharge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "discharge" }) });
    setBusy(false);
    if (!res.ok) return;
    router.push("/residents");
    router.refresh();
  }

  return (
    <button type="button" disabled={busy} onClick={discharge} className="no-print text-xs font-semibold text-red-800 whitespace-nowrap disabled:opacity-50">
      {busy ? "…" : "Discharge"}
    </button>
  );
}
