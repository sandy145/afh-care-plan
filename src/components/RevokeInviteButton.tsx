"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function revoke() {
    if (!confirm("Revoke this invite?")) return;
    setBusy(true);
    const res = await fetch(`/api/homes/invites/${inviteId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Could not revoke this invite");
      return;
    }
    router.refresh();
  }

  return (
    <button type="button" disabled={busy} onClick={revoke} className="text-xs font-semibold text-red-800 disabled:opacity-50">
      {busy ? "…" : "Revoke"}
    </button>
  );
}
