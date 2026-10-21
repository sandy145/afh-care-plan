import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile } from "./plan";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("id,full_name,role,home_id").eq("id", user.id).single();
  return { supabase, user, profile: profile as Profile | null };
}
