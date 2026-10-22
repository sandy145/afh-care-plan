import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_req: Request, { params }: { params: Promise<{ inviteId: string }> }) {
  const { inviteId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Only an AFH admin can revoke invites" }, { status: 403 });

  // RLS already scopes this to invites in the admin's own active home.
  const { error } = await supabase.from("home_invites").update({ status: "revoked" }).eq("id", inviteId).eq("status", "pending");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
