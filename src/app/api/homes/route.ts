import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Self-serve: any signed-in user can register a brand-new Adult Family Home and
// becomes its admin. Used both from sign-up and from the "no home yet" screen.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { name } = (await req.json()) as { name?: string };
  if (!name?.trim()) return NextResponse.json({ error: "Home name is required" }, { status: 400 });

  const { data, error } = await supabase.rpc("create_home", { p_name: name.trim() });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ homeId: data });
}
