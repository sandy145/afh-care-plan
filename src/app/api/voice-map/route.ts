import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { loadPlan, planAsText, fullName } from "@/lib/plan";
import { fieldOf } from "@/lib/ncp-template";

export interface Proposed {
  field_id: string;
  new_value: string;
  reason: string;
  significant: boolean;
}

const SYSTEM = `You help an Adult Family Home caregiver keep a Washington DSHS Negotiated Care Plan (NCP) current.
You receive the resident's current plan (field ids with labels and values) and a spoken note transcribed from a caregiver.
Return ONLY a JSON object: {"changes":[{"field_id":"...","new_value":"...","reason":"...","significant":true|false}],"daily_note":"..."}.
Rules:
- Only propose changes the note clearly supports. Do not invent details.
- field_id must be one of the ids in the plan. Pick the most specific field. The "*.caregiver" field holds "Caregiver will ..." instructions; "*.strengths" holds what the resident can do; column-1 fields hold the form's checkboxes and short facts.
- For "*.level" fields the value must be exactly one of: independent, supervision, assistance, dependent.
- Write new_value as it should read on the printed plan: complete, in the form's register ("Caregiver will provide 2-person assist with gait belt for every transfer."). Merge with the existing value when the note adds to it rather than replaces it.
- significant = true when the change alters the level of assistance, safety plan, hospice/medical status, diet texture, falls, or behavior interventions.
- reason: a few words naming the trigger (e.g. "started hospice 10/19").
- Observations that do not change the plan (e.g. "ate well today") go in daily_note, not in changes. daily_note may be empty.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { residentId, transcript, sectionHint } = (await req.json()) as { residentId: string; transcript: string; sectionHint?: string };
  if (!transcript?.trim()) return NextResponse.json({ error: "Empty transcript" }, { status: 400 });
  const plan = await loadPlan(supabase, residentId);
  if (!plan) return NextResponse.json({ error: "Resident not found" }, { status: 404 });

  // Save the note first so nothing is lost even if mapping fails.
  const { data: note, error: noteErr } = await supabase.from("voice_notes").insert({ resident_id: residentId, author_id: user.id, transcript }).select("id").single();
  if (noteErr) return NextResponse.json({ error: noteErr.message }, { status: 400 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ noteId: note.id, changes: [], daily_note: "", warning: "ANTHROPIC_API_KEY is not set — pick the section and edit by hand." });
  }

  const client = new Anthropic();
  const today = new Date().toLocaleDateString("en-US");
  const userMsg = `Resident: ${fullName(plan.resident)}\nToday: ${today}\n${sectionHint ? `The caregiver was looking at section "${sectionHint}" when recording.\n` : ""}\nCURRENT PLAN:\n${planAsText(plan.values)}\n\nSPOKEN NOTE:\n"""${transcript}"""`;

  let changes: Proposed[] = [];
  let daily_note = "";
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as { changes?: Proposed[]; daily_note?: string };
    changes = (parsed.changes ?? []).filter((c) => fieldOf(c.field_id) && typeof c.new_value === "string");
    daily_note = parsed.daily_note ?? "";
  } catch (e) {
    return NextResponse.json({ noteId: note.id, changes: [], daily_note: "", warning: `Could not map the note: ${(e as Error).message}` });
  }

  await supabase.from("voice_notes").update({ proposed: changes }).eq("id", note.id);
  if (daily_note.trim()) await supabase.from("daily_notes").insert({ resident_id: residentId, author_id: user.id, text: daily_note });

  const current: Record<string, string | null> = {};
  for (const c of changes) current[c.field_id] = plan.values[c.field_id]?.value ?? null;
  return NextResponse.json({ noteId: note.id, changes, daily_note, current });
}
