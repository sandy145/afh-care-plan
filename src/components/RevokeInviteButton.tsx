"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { friendlyError } from "@/lib/friendlyError";

export default function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revoke() {
    if (!confirm("Revoke this invite?")) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/homes/invites/${inviteId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(friendlyError(data.error ?? "Could not revoke this invite"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" disabled={busy} onClick={revoke} className="text-xs font-semibold text-red-800 disabled:opacity-50">
        {busy ? "…" : "Revoke"}
      </button>
      {error && <p className="text-[11px] text-red-700 text-right max-w-[9rem]">{error}</p>}
    </div>
  );
}
