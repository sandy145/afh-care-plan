import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("home_id").eq("id", user.id).single();
  if (!profile?.home_id) return NextResponse.json({ error: "No home on this account" }, { status: 400 });

  const body = await req.json();
  const { first_name, last_name, date_of_birth, admit_date, original_plan_date } = body as {
    first_name?: string;
    last_name?: string;
    date_of_birth?: string | null;
    admit_date?: string | null;
    original_plan_date?: string | null;
  };
  if (!first_name?.trim() || !last_name?.trim()) return NextResponse.json({ error: "First and last name are required" }, { status: 400 });

  const { data, error } = await supabase
    .from("residents")
    .insert({
      home_id: profile.home_id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      date_of_birth: date_of_birth || null,
      admit_date: admit_date || null,
      original_plan_date: original_plan_date || admit_date || null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
