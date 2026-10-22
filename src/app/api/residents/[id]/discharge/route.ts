import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { action, discharge_date } = (await req.json().catch(() => ({}))) as { action?: "discharge" | "restore"; discharge_date?: string };
  const value = action === "restore" ? null : discharge_date || new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("residents").update({ discharge_date: value }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ discharge_date: value });
}
