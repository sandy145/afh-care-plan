"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const IDLE_MINUTES = 15;

// Resident records are PHI — auto-sign-out after inactivity so a device left unlocked
// doesn't leave a care plan open indefinitely.
export default function IdleLock() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function reset() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        await createClient().auth.signOut();
        router.push("/login?timeout=1");
        router.refresh();
      }, IDLE_MINUTES * 60 * 1000);
    }
    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [router]);

  return null;
}
