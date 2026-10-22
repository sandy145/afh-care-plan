import AppHeader from "@/components/AppHeader";
import NewResidentForm from "@/components/NewResidentForm";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewResidentPage() {
  await requireUser();
  return (
    <main className="min-h-screen flex flex-col max-w-lg mx-auto">
      <AppHeader title="Add resident" subtitle="New Negotiated Care Plan" back="/residents" />
      <NewResidentForm />
    </main>
  );
}
