import { Role } from "@prisma/client";
import { AppNav } from "@/components/AppNav";
import { AdminSettings } from "@/components/AdminSettings";
import { requireSession } from "@/lib/utils";

export default async function AdminSettingsPage() {
  await requireSession([Role.ADMIN]);

  return (
    <div className="app-shell">
      <AppNav title="Admin settings" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
        <AdminSettings />
      </main>
    </div>
  );
}
