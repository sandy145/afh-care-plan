import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { homeId } = (await req.json()) as { homeId?: string };
  if (!homeId) return NextResponse.json({ error: "homeId is required" }, { status: 400 });

  const { error } = await supabase.rpc("switch_active_home", { p_home_id: homeId });
  if (error) return NextResponse.json({ error: "You're not a member of that home." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
