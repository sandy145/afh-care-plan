"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteUserForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "caregiver">("caregiver");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/homes/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Could not send invite");
    setMessage(data.message ?? "Invite sent.");
    setEmail("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="bg-white border border-line rounded-2xl p-3.5 flex flex-col gap-3">
      <div className="text-sm font-semibold">Invite someone by email</div>
      <div className="flex gap-2">
        <input type="email" required placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 h-11 px-3 rounded-lg border border-gray-300 text-sm" />
        <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "caregiver")} className="h-11 px-2 rounded-lg border border-gray-300 text-sm">
          <option value="caregiver">Caregiver</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-sm text-green-800">{message}</p>}
      <button disabled={busy} className="h-11 rounded-lg bg-navy text-white font-semibold text-sm disabled:opacity-60">
        {busy ? "Sending…" : "Send invite"}
      </button>
    </form>
  );
}
