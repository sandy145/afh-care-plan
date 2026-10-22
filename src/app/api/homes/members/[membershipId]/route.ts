import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(_req: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  const { membershipId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("home_id,role").eq("id", user.id).single();
  if (profile?.role !== "admin" || !profile.home_id) return NextResponse.json({ error: "Only an AFH admin can remove users" }, { status: 403 });

  const { data: membership } = await supabase.from("home_memberships").select("id,user_id,home_id").eq("id", membershipId).single();
  if (!membership || membership.home_id !== profile.home_id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (membership.user_id === user.id) return NextResponse.json({ error: "You can't remove yourself." }, { status: 400 });

  // RLS lets an admin delete a membership row in their own active home directly.
  const { error: delErr } = await supabase.from("home_memberships").delete().eq("id", membershipId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });

  // If that was the removed user's active home, switch them to another membership they
  // still hold (or clear it). Updating someone else's profile needs the service-role client.
  try {
    const admin = createAdminClient();
    const { data: removedProfile } = await admin.from("profiles").select("home_id").eq("id", membership.user_id).single();
    if (removedProfile?.home_id === profile.home_id) {
      const { data: fallback } = await admin
        .from("home_memberships")
        .select("home_id,role")
        .eq("user_id", membership.user_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      await admin
        .from("profiles")
        .update({ home_id: fallback?.home_id ?? null, role: fallback?.role ?? null })
        .eq("id", membership.user_id);
    }
  } catch {
    // SUPABASE_SERVICE_ROLE_KEY not configured yet — the membership is still gone (and
    // my_home_id() requires a live membership), so access is already revoked either way.
  }

  return NextResponse.json({ ok: true });
}
