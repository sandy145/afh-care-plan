"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterHomeForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/homes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Could not register this home");
    router.push("/residents");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Adult Family Home name
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maple Grove AFH" className="h-12 px-3.5 rounded-xl border border-gray-300 bg-white font-normal text-base" />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="mt-2 h-13 py-3.5 rounded-xl bg-navy text-white font-semibold text-base disabled:opacity-60">
        {busy ? "…" : "Register this home"}
      </button>
      <p className="text-xs text-muted">You&apos;ll be its admin, with your own resident list and the DSHS care plan template loaded automatically. You can invite caregivers and other admins once it&apos;s set up.</p>
    </form>
  );
}
