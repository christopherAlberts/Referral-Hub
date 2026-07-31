import { Role } from "@prisma/client";
import { AppNav } from "@/components/AppNav";
import { PsychiatristBoard } from "@/components/PsychiatristBoard";
import { requireSession } from "@/lib/utils";

export default async function PsychiatristPage() {
  await requireSession([Role.PSYCHIATRIST, Role.ADMIN]);

  return (
    <div className="app-shell">
      <AppNav title="Psychiatrist board" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-5">
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>
            Who’s open today
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Live therapist capacity in colored bubbles — flip between three columns or one list.
          </p>
        </div>
        <PsychiatristBoard />
      </main>
    </div>
  );
}
