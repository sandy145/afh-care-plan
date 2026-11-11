"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmedPage() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok" | "invalid">("checking");

  useEffect(() => {
    // The confirmation link's session token arrives in the URL hash; the Supabase
    // client parses it on load and establishes a session before this check runs.
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) {
          setState("ok");
          const t = setTimeout(() => {
            router.push("/residents");
            router.refresh();
          }, 900);
          return () => clearTimeout(t);
        }
        setState("invalid");
      });
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-7 gap-5 text-center">
      {state === "checking" && <p className="text-sm text-muted">Confirming your account…</p>}

      {state === "ok" && (
        <>
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Email confirmed!</h1>
            <p className="text-muted text-sm mt-1">Taking you to your care plan…</p>
          </div>
        </>
      )}

      {state === "invalid" && (
        <>
          <p className="text-sm text-red-700">This confirmation link is invalid or has expired.</p>
          <button type="button" onClick={() => router.push("/login")} className="h-12 px-6 rounded-xl bg-navy text-white font-semibold">
            Go to sign in
          </button>
        </>
      )}
    </main>
  );
}
