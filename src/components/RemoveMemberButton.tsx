"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RemoveMemberButton({ membershipId, name }: { membershipId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Remove ${name} from this home? They'll lose access immediately.`)) return;
    setBusy(true);
    const res = await fetch(`/api/homes/members/${membershipId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Could not remove this user");
      return;
    }
    router.refresh();
  }

  return (
    <button type="button" disabled={busy} onClick={remove} className="text-xs font-semibold text-red-800 disabled:opacity-50">
      {busy ? "…" : "Remove"}
    </button>
  );
}
