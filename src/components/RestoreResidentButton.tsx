"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { friendlyError } from "@/lib/friendlyError";

export default function RestoreResidentButton({ residentId }: { residentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restore() {
    if (!confirm("Restore this resident to the active list?")) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/residents/${residentId}/discharge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore" }) });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(friendlyError(data.error ?? "Could not restore this resident"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" disabled={busy} onClick={restore} className="text-xs font-semibold text-navy border border-gray-300 rounded-lg px-3 py-2 whitespace-nowrap disabled:opacity-50">
        {busy ? "…" : "Restore"}
      </button>
      {error && <p className="text-[11px] text-red-700 text-right max-w-[9rem]">{error}</p>}
    </div>
  );
}
