import { Role } from "@prisma/client";
import { AppNav } from "@/components/AppNav";
import { CapacityForm } from "@/components/CapacityForm";
import { requireSession } from "@/lib/utils";

export default async function TherapistPage() {
  await requireSession([Role.THERAPIST, Role.ADMIN]);

  return (
    <div className="app-shell">
      <AppNav title="Therapist dashboard" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
        <CapacityForm />
      </main>
    </div>
  );
}
