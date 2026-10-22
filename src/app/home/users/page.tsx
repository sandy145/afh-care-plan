import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import InviteUserForm from "@/components/InviteUserForm";
import RemoveMemberButton from "@/components/RemoveMemberButton";
import RevokeInviteButton from "@/components/RevokeInviteButton";
import { requireUser } from "@/lib/auth";
import { fmtDate } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function HomeUsersPage() {
  const { supabase, profile, user } = await requireUser();
  if (!profile?.home_id) redirect("/residents");
  if (profile.role !== "admin") redirect("/residents");

  const [{ data: home }, { data: memberships }, { data: invites }] = await Promise.all([
    supabase.from("homes").select("name").eq("id", profile.home_id).maybeSingle(),
    supabase.from("home_memberships").select("id,user_id,role,created_at").eq("home_id", profile.home_id).order("created_at"),
    supabase.from("home_invites").select("id,email,role,status,created_at").eq("home_id", profile.home_id).order("created_at", { ascending: false }).limit(25),
  ]);

  const userIds = (memberships ?? []).map((m) => m.user_id);
  const { data: memberProfiles } = userIds.length ? await supabase.from("profiles").select("id,full_name").in("id", userIds) : { data: [] };
  const nameOf: Record<string, string> = {};
  for (const p of memberProfiles ?? []) nameOf[p.id] = p.full_name;

  const pendingInvites = (invites ?? []).filter((i) => i.status === "pending");
  const pastInvites = (invites ?? []).filter((i) => i.status !== "pending");

  return (
    <main className="min-h-screen flex flex-col max-w-lg mx-auto">
      <AppHeader title="Users" subtitle={home?.name ?? "Adult Family Home"} back="/residents" />
      <div className="p-5 flex flex-col gap-5">
        <InviteUserForm />

        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">Members</div>
          <div className="bg-white border border-line rounded-2xl divide-y divide-gray-100">
            {(memberships ?? []).map((m) => (
              <div key={m.id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{nameOf[m.user_id] ?? "—"}</div>
                  <div className="text-xs text-muted">
                    {m.role === "admin" ? "Admin" : "Caregiver"} · since {fmtDate(m.created_at)}
                  </div>
                </div>
                {m.user_id !== user.id && <RemoveMemberButton membershipId={m.id} name={nameOf[m.user_id] ?? "this user"} />}
              </div>
            ))}
            {(memberships ?? []).length === 0 && <div className="p-3 text-sm text-muted">No members yet.</div>}
          </div>
        </div>

        {pendingInvites.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">Pending invites</div>
            <div className="bg-white border border-line rounded-2xl divide-y divide-gray-100">
              {pendingInvites.map((i) => (
                <div key={i.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{i.email}</div>
                    <div className="text-xs text-muted">
                      {i.role === "admin" ? "Admin" : "Caregiver"} · invited {fmtDate(i.created_at)}
                    </div>
                  </div>
                  <RevokeInviteButton inviteId={i.id} />
                </div>
              ))}
            </div>
          </div>
        )}

        {pastInvites.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">Invite history</div>
            <div className="bg-white border border-line rounded-2xl divide-y divide-gray-100 text-sm">
              {pastInvites.map((i) => (
                <div key={i.id} className="p-3 flex items-center justify-between text-muted">
                  <span>{i.email}</span>
                  <span className="text-xs capitalize">{i.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
