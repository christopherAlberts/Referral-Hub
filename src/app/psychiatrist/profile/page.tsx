import { Role } from "@prisma/client";
import { AppNav } from "@/components/AppNav";
import { SimpleProfileForm } from "@/components/SimpleProfileForm";
import { requireSession } from "@/lib/utils";

export default async function PsychiatristProfilePage() {
  await requireSession([Role.PSYCHIATRIST, Role.ADMIN]);

  return (
    <div className="app-shell">
      <AppNav title="Psychiatrist profile" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
        <SimpleProfileForm />
      </main>
    </div>
  );
}
