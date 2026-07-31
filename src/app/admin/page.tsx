import { Role } from "@prisma/client";
import { AppNav } from "@/components/AppNav";
import { AdminUsers } from "@/components/AdminUsers";
import { requireSession } from "@/lib/utils";

export default async function AdminPage() {
  await requireSession([Role.ADMIN]);

  return (
    <div className="app-shell">
      <AppNav title="Admin" />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
        <AdminUsers />
      </main>
    </div>
  );
}
