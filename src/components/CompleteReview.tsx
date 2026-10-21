"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CompleteReview({ residentId, reviewerName, residentName, nextDue }: { residentId: string; reviewerName: string; residentName: string; nextDue: string }) {
  const router = useRouter();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ residentId }) });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error ?? "Could not record the review");
    router.push(`/residents/${residentId}/print?changes=1`);
    router.refresh();
  }

  return (
    <>
      <div className="bg-white border border-line rounded-2xl p-3.5 flex flex-col gap-2.5">
        <label className="flex gap-2.5 items-start text-sm cursor-pointer">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="w-5 h-5 mt-0.5" />
          <span>
            I have reviewed the full care plan for {residentName} and it reflects their current needs as of <strong>{new Date().toLocaleDateString("en-US")}</strong>.
          </span>
        </label>
        <div className="text-xs text-muted">
          Next review due <strong className="text-ink">{nextDue}</strong>. Reviewer: {reviewerName}.
        </div>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line p-4 max-w-lg mx-auto flex flex-col gap-2">
        <button type="button" disabled={!agree || busy} onClick={complete} className="h-13 py-3.5 rounded-xl bg-navy text-white font-semibold disabled:opacity-50">
          {busy ? "Recording…" : "Complete review and print changes"}
        </button>
        <div className="flex gap-2">
          <Link href={`/residents/${residentId}/print`} className="flex-1 h-11 rounded-lg border border-gray-300 font-semibold text-sm text-navy flex items-center justify-center">
            Print full plan
          </Link>
          <Link href={`/residents/${residentId}/print?changes=1`} className="flex-1 h-11 rounded-lg border border-gray-300 font-semibold text-sm text-navy flex items-center justify-center">
            Print changes only
          </Link>
        </div>
      </div>
    </>
  );
}
