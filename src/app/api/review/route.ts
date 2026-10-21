import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadPlan } from "@/lib/plan";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { residentId, note } = (await req.json()) as { residentId: string; note?: string };
  const plan = await loadPlan(supabase, residentId);
  if (!plan) return NextResponse.json({ error: "Resident not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      resident_id: residentId,
      reviewer_id: user.id,
      plan_version: plan.version,
      changes_count: plan.changesSinceReview.length,
      significant_count: plan.changesSinceReview.filter((c) => c.significant).length,
      note: note ?? null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
