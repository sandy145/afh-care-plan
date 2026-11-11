"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/friendlyError";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [homeName, setHomeName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("timeout") === "1") setTimedOut(true);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const res =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName, new_home_name: homeName },
              emailRedirectTo: `${window.location.origin}/confirmed`,
            },
          });
    setBusy(false);
    if (res.error) return setError(friendlyError(res.error.message));
    if (mode === "signup" && !res.data.session) {
      setAwaitingConfirmation(true);
      return;
    }
    router.push("/residents");
    router.refresh();
  }

  async function resendConfirmation() {
    setResendBusy(true);
    setError(null);
    const { error } = await createClient().auth.resend({ type: "signup", email, options: { emailRedirectTo: `${window.location.origin}/confirmed` } });
    setResendBusy(false);
    if (error) return setError(friendlyError(error.message));
    setInfo("Confirmation email sent again — check your inbox (and spam folder).");
  }

  async function forgotPassword() {
    if (!email.trim()) return setError("Enter your email above first, then tap “Forgot password” again.");
    setBusy(true);
    setError(null);
    setInfo(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) return setError(friendlyError(error.message));
    setInfo("Check your email for a link to set a new password.");
  }

  if (awaitingConfirmation) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-7 gap-5 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
          <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#1f3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m2 7 10 6 10-6" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold">Check your email</h1>
          <p className="text-muted text-sm mt-2 max-w-xs">
            We sent a confirmation link to <strong>{email}</strong>. Tap it and you&apos;ll be signed in automatically — no need to come back here.
          </p>
        </div>
        {info && <p className="text-sm text-green-800">{info}</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="button" disabled={resendBusy} onClick={resendConfirmation} className="text-sm text-navy font-semibold disabled:opacity-60">
          {resendBusy ? "Sending…" : "Didn't get it? Resend the email"}
        </button>
        <button type="button" onClick={() => setAwaitingConfirmation(false)} className="text-xs text-muted underline">
          Back
        </button>
      </main>
    );
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

      {timedOut && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">You were signed out after a period of inactivity, to keep resident records secure. Sign back in to continue.</p>}

      <form onSubmit={submit} className="flex flex-col gap-4">
        {mode === "signup" && (
          <>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Full name
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 px-3.5 rounded-xl border border-gray-300 bg-white font-normal text-base" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Adult Family Home name
              <input required value={homeName} onChange={(e) => setHomeName(e.target.value)} placeholder="e.g. Maple Grove AFH" className="h-12 px-3.5 rounded-xl border border-gray-300 bg-white font-normal text-base" />
              <span className="text-xs text-muted font-normal">Creating an account here registers a new home and makes you its admin. If a caregiver or admin invited you to an existing home, use the link in that invite email instead.</span>
            </label>
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
        {mode === "signin" && (
          <button type="button" onClick={forgotPassword} className="text-sm text-navy font-semibold self-start -mt-2">
            Forgot password?
          </button>
        )}
        {info && <p className="text-sm text-green-800">{info}</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="mt-2 h-13 rounded-xl bg-navy text-white font-semibold text-base disabled:opacity-60 py-3.5">
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setInfo(null);
        }}
        className="text-sm text-navy font-semibold"
      >
        {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>

      <p className="mt-auto text-xs text-muted text-center">Resident records are private health information. Sign out when you leave the device.</p>
    </main>
  );
}
