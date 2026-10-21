import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import VoiceNote from "@/components/VoiceNote";
import { requireUser } from "@/lib/auth";
import { fullName } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function VoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string }> }) {
  const { id } = await params;
  const { s } = await searchParams;
  const { supabase, profile } = await requireUser();
  const { data: resident } = await supabase.from("residents").select("id,first_name,last_name").eq("id", id).single();
  if (!resident) notFound();
  return (
    <main className="min-h-screen flex flex-col max-w-lg mx-auto">
      <AppHeader title="Voice note" subtitle={`${fullName(resident)} · ${profile?.full_name ?? ""}`} back={`/residents/${id}`} />
      <VoiceNote residentId={id} sectionHint={s} authorName={profile?.full_name ?? "you"} />
    </main>
  );
}
