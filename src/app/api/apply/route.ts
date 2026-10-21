import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fieldOf } from "@/lib/ncp-template";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const { residentId, changes, voiceNoteId } = body as {
    residentId: string;
    changes: { field_id: string; new_value: string | null; reason?: string | null; significant?: boolean }[];
    voiceNoteId?: string;
  };
  if (!residentId || !Array.isArray(changes) || changes.length === 0) return NextResponse.json({ error: "Nothing to apply" }, { status: 400 });
  const bad = changes.find((c) => !fieldOf(c.field_id));
  if (bad) return NextResponse.json({ error: `Unknown field ${bad.field_id}` }, { status: 400 });

  const { data, error } = await supabase.rpc("apply_changes", { p_resident_id: residentId, p_changes: changes, p_voice_note_id: voiceNoteId ?? null });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ version: data });
}
