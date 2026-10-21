"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "caregiver">("caregiver");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role } } });
    setBusy(false);
    if (res.error) return setError(res.error.message);
    if (mode === "signup" && !res.data.session) return setError("Check your email to confirm the account, then sign in.");
    router.push("/residents");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col px-7 pt-16 pb-10 max-w-md mx-auto gap-8">
      <div>
        <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center">
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 21V8l8-5 8 5v13" />
            <path d="M9 21v-6h6v6" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold">Care Plan</h1>
        <p className="text-muted text-sm mt-1">Adult Family Home — Negotiated Care Plan</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        {mode === "signup" && (
          <>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Full name
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 px-3.5 rounded-xl border border-gray-300 bg-white font-normal text-base" />
            </label>
            <fieldset className="flex gap-2.5">
              <legend className="text-sm font-semibold mb-1.5">Role</legend>
              {(["admin", "caregiver"] as const).map((r) => (
                <label key={r} className={`flex-1 rounded-xl border p-3 text-sm cursor-pointer ${role === r ? "border-navy bg-blue-50" : "border-line bg-white"}`}>
                  <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="mr-2" />
                  {r === "admin" ? "AFH Admin" : "Caregiver"}
                </label>
              ))}
            </fieldset>
          </>
        )}
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 px-3.5 rounded-xl border border-gray-300 bg-white font-normal text-base" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Password
          <input type="password" required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 px-3.5 rounded-xl border border-gray-300 bg-white font-normal text-base" />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="mt-2 h-13 rounded-xl bg-navy text-white font-semibold text-base disabled:opacity-60 py-3.5">
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-sm text-navy font-semibold">
        {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>

      <p className="mt-auto text-xs text-muted text-center">Resident records are private health information. Sign out when you leave the device.</p>
    </main>
  );
}
