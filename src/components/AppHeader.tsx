import Link from "next/link";
import SignOutButton from "./SignOutButton";
import HomeSwitcher from "./HomeSwitcher";
import IdleLock from "./IdleLock";
import { createClient } from "@/lib/supabase/server";

export default async function AppHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  right?: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let who: { full_name: string; role: string } | null = null;
  let homes: { home_id: string; name: string }[] = [];
  let activeHomeId: string | null = null;
  let isAdmin = false;

  if (user) {
    const [{ data: profile }, { data: memberships }] = await Promise.all([
      supabase.from("profiles").select("full_name,role,home_id").eq("id", user.id).single(),
      supabase.from("home_memberships").select("home_id,homes(name)").eq("user_id", user.id).order("created_at"),
    ]);
    if (profile?.role) who = { full_name: profile.full_name, role: profile.role };
    activeHomeId = profile?.home_id ?? null;
    isAdmin = profile?.role === "admin";
    homes = ((memberships ?? []) as unknown as { home_id: string; homes: { name: string } | null }[]).map((m) => ({ home_id: m.home_id, name: m.homes?.name ?? "" }));
  }

  return (
    <header className="no-print bg-white border-b border-line px-5 pt-5 pb-3 flex items-center gap-2.5 sticky top-0 z-10">
      <IdleLock />
      {back && (
        <Link href={back} aria-label="Back" className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1f3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold truncate">{title}</h1>
        {subtitle && <div className="text-xs text-muted truncate">{subtitle}</div>}
      </div>
      {right}
      {who && (
        <div className="flex items-center gap-2">
          {homes.length > 1 && <HomeSwitcher homes={homes} activeHomeId={activeHomeId} />}
          {isAdmin && (
            <Link href="/home/users" aria-label="Manage users" className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b626e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </Link>
          )}
          <span className="text-xs text-muted bg-gray-100 px-2.5 py-1.5 rounded-full whitespace-nowrap">
            {who.full_name.split(" ")[0]} · {who.role === "admin" ? "Admin" : "Caregiver"}
          </span>
          <SignOutButton />
        </div>
      )}
    </header>
  );
}
