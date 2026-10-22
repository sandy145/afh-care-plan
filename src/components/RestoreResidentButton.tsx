"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RestoreResidentButton({ residentId }: { residentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function restore() {
    if (!confirm("Restore this resident to the active list?")) return;
    setBusy(true);
    await fetch(`/api/residents/${residentId}/discharge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore" }) });
    setBusy(false);
    router.refresh();
  }

  return (
    <button type="button" disabled={busy} onClick={restore} className="text-xs font-semibold text-navy border border-gray-300 rounded-lg px-3 py-2 whitespace-nowrap disabled:opacity-50">
      {busy ? "…" : "Restore"}
    </button>
  );
}
