"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewResidentForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [admitDate, setAdmitDate] = useState(new Date().toISOString().slice(0, 10));
  const [planDate, setPlanDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/residents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dob || null,
        admit_date: admitDate || null,
        original_plan_date: planDate || admitDate || null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Could not add resident");
    router.push(`/residents/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="p-5 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        First name
        <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-12 px-3.5 rounded-xl border border-gray-300 bg-white font-normal text-base" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Last name
        <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-12 px-3.5 rounded-xl border border-gray-300 bg-white font-normal text-base" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Date of birth
        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="h-12 px-3.5 rounded-xl border border-gray-300 bg-white font-normal text-base" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Admit date
        <input type="date" value={admitDate} onChange={(e) => setAdmitDate(e.target.value)} className="h-12 px-3.5 rounded-xl border border-gray-300 bg-white font-normal text-base" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Date of original care plan
        <input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} placeholder={admitDate} className="h-12 px-3.5 rounded-xl border border-gray-300 bg-white font-normal text-base" />
        <span className="text-xs text-muted font-normal">Starts the 14-day review clock. Defaults to the admit date.</span>
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="mt-2 h-13 py-3.5 rounded-xl bg-navy text-white font-semibold text-base disabled:opacity-60">
        {busy ? "Adding…" : "Add resident"}
      </button>
      <p className="text-xs text-muted">The NCP template loads automatically — every section starts blank, ready to fill in by voice or by hand.</p>
    </form>
  );
}
