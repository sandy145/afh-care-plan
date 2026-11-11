"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { friendlyError } from "@/lib/friendlyError";

export default function DischargeResidentButton({ residentId, residentName }: { residentId: string; residentName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function discharge() {
    if (!confirm(`Discharge ${residentName}? Their plan stays readable under Archived residents, but drops off the active list.`)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/residents/${residentId}/discharge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "discharge" }) });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(friendlyError(data.error ?? "Could not discharge this resident"));
      return;
    }
    router.push("/residents");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" disabled={busy} onClick={discharge} className="no-print text-xs font-semibold text-red-800 whitespace-nowrap disabled:opacity-50">
        {busy ? "…" : "Discharge"}
      </button>
      {error && <p className="no-print text-[11px] text-red-700 text-right max-w-[9rem]">{error}</p>}
    </div>
  );
}
