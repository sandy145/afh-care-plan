"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomeSwitcher({ homes, activeHomeId }: { homes: { home_id: string; name: string }[]; activeHomeId: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function switchTo(homeId: string) {
    if (!homeId || homeId === activeHomeId || busy) return;
    setBusy(true);
    await fetch("/api/homes/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ homeId }) });
    setBusy(false);
    router.push("/residents");
    router.refresh();
  }

  return (
    <select
      value={activeHomeId ?? ""}
      disabled={busy}
      onChange={(e) => switchTo(e.target.value)}
      aria-label="Switch Adult Family Home"
      className="text-xs bg-gray-100 border border-gray-300 rounded-full pl-2.5 pr-1.5 py-1.5 max-w-[8.5rem] truncate disabled:opacity-60"
    >
      {homes.map((h) => (
        <option key={h.home_id} value={h.home_id}>
          {h.name}
        </option>
      ))}
    </select>
  );
}
