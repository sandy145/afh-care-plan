"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendlyError";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // The reset link's session token arrives in the URL hash; the Supabase client
    // parses it on load and establishes a (recovery-scoped) session before this runs.
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        setValid(!!data.session);
        setReady(true);
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(friendlyError(error.message));
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
        <h1 className="mt-4 text-2xl font-bold">Set a new password</h1>
      </div>

      {!ready && <p className="text-sm text-muted">Checking your reset link…</p>}

      {ready && !valid && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-red-700">This reset link is invalid or has expired. Request a new one from the sign-in page.</p>
          <button type="button" onClick={() => router.push("/login")} className="h-12 rounded-xl bg-navy text-white font-semibold">
            Go to sign in
          </button>
        </div>
      )}

      {ready && valid && (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            New password
            <input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 px-3.5 rounded-xl border border-gray-300 bg-white font-normal text-base" />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="mt-2 h-13 py-3.5 rounded-xl bg-navy text-white font-semibold text-base disabled:opacity-60">
            {busy ? "…" : "Set password and continue"}
          </button>
        </form>
      )}
    </main>
  );
}
