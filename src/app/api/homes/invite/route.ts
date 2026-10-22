import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Admin-only: invite someone by email to the signer's current home. Sends a real
// Supabase invite email for brand-new addresses; for an email that already has an
// account elsewhere, adds the membership directly instead (no invite email exists
// for an existing user, so there's nothing to send).
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("home_id,role").eq("id", user.id).single();
  if (!profile?.home_id) return NextResponse.json({ error: "No active home" }, { status: 400 });
  if (profile.role !== "admin") return NextResponse.json({ error: "Only an AFH admin can invite users" }, { status: 403 });

  const { email, role } = (await req.json()) as { email?: string; role?: "admin" | "caregiver" };
  if (!email?.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  const normalizedEmail = email.trim().toLowerCase();
  const invitedRole = role === "admin" ? "admin" : "caregiver";

  const { data: home } = await supabase.from("homes").select("name").eq("id", profile.home_id).single();

  const { error: inviteRowErr } = await supabase.from("home_invites").insert({
    home_id: profile.home_id,
    email: normalizedEmail,
    role: invitedRole,
    invited_by: user.id,
  });
  if (inviteRowErr) return NextResponse.json({ error: inviteRowErr.message }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Invite recorded, but no email could be sent — SUPABASE_SERVICE_ROLE_KEY is not configured on this deployment yet." },
      { status: 200 },
    );
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
    data: { invited_home_id: profile.home_id, invited_role: invitedRole },
    redirectTo: `${site}/accept-invite`,
  });

  if (inviteErr) {
    // Most likely cause: this email already has an account. Add the membership directly.
    const { data: added, error: addErr } = await admin.rpc("add_existing_user_to_home", {
      p_email: normalizedEmail,
      p_home_id: profile.home_id,
      p_role: invitedRole,
    });
    if (addErr || !added) {
      return NextResponse.json({ error: inviteErr.message || "Could not invite this email." }, { status: 400 });
    }
    return NextResponse.json({ status: "added", message: `${normalizedEmail} already has an account and was added to ${home?.name ?? "this home"} directly — no email sent.` });
  }

  return NextResponse.json({ status: "invited", message: `Invite email sent to ${normalizedEmail}.` });
}
