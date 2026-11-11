"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { friendlyError } from "@/lib/friendlyError";

export default function RemoveMemberButton({ membershipId, name }: { membershipId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!confirm(`Remove ${name} from this home? They'll lose access immediately.`)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/homes/members/${membershipId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(friendlyError(data.error ?? "Could not remove this user"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" disabled={busy} onClick={remove} className="text-xs font-semibold text-red-800 disabled:opacity-50">
        {busy ? "…" : "Remove"}
      </button>
      {error && <p className="text-[11px] text-red-700 text-right max-w-[9rem]">{error}</p>}
    </div>
  );
}
