"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogoMark } from "@/components/LogoMark";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("psych@referralhub.test");
  const [password, setPassword] = useState("Psych123!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setBusy(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    const callback = params.get("callbackUrl");
    router.push(callback || "/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="glass w-full max-w-md space-y-4 rounded-[28px] p-6">
      <div>
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8 text-[var(--ink)]" />
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Referral Hub
          </p>
        </div>
        <h1 className="mt-2 text-3xl leading-tight" style={{ fontFamily: "var(--font-display)" }}>
          Sign in
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Capacity board for psychiatric referral teams.
        </p>
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-[var(--red)]">{error}</p>}
      <button className="btn w-full" disabled={busy}>
        {busy ? "Signing in…" : "Continue"}
      </button>
      <div className="rounded-2xl bg-white/60 p-3 text-xs leading-relaxed text-[var(--muted)]">
        <p className="font-semibold text-[var(--ink)]">Test accounts</p>
        <p>admin@referralhub.test / Admin123!</p>
        <p>psych@referralhub.test / Psych123!</p>
        <p>therapist@referralhub.test / Therapy123!</p>
      </div>
    </form>
  );
}
