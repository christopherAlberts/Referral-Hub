import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="app-shell items-center justify-center px-4 py-10">
      <Suspense fallback={<div className="text-[var(--muted)]">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
