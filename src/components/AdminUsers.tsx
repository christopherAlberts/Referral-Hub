"use client";

import { FormEvent, useEffect, useState } from "react";
import { Role } from "@prisma/client";
import { COMMON_TIMEZONES } from "@/lib/timezone";
import { statusLabel } from "@/lib/utils";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  timezone: string;
  active: boolean;
  specialty: string | null;
  pushEnabled: boolean;
  lastAvailability: {
    date: string;
    status: string;
    slots: number | null;
    updatedAt: string;
  } | null;
};

const emptyForm = {
  email: "",
  name: "",
  role: Role.THERAPIST as Role,
  timezone: "Africa/Johannesburg",
  password: "",
  specialty: "",
  bio: "",
  phone: "",
};

export function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/users");
    if (!res.ok) return;
    const data = await res.json();
    setUsers(data.users ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error?.toString?.() ?? "Could not create user");
      return;
    }
    setForm(emptyForm);
    setMessage("User created.");
    load();
  }

  async function toggleActive(user: UserRow) {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, active: !user.active }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <section className="glass rounded-[28px] p-5">
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
          Accounts
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Only admins create therapist and psychiatrist accounts.
        </p>
      </section>

      <form onSubmit={onCreate} className="glass grid gap-3 rounded-[28px] p-5 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-semibold">Create user</h2>
        <div className="field">
          <label>Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
          >
            <option value={Role.THERAPIST}>Therapist</option>
            <option value={Role.PSYCHIATRIST}>Psychiatrist</option>
            <option value={Role.ADMIN}>Admin</option>
          </select>
        </div>
        <div className="field">
          <label>Timezone</label>
          <select
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Temporary password</label>
          <input
            type="text"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        {form.role === Role.THERAPIST && (
          <div className="field">
            <label>Specialty</label>
            <input
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            />
          </div>
        )}
        <div className="md:col-span-2">
          <button className="btn" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
          {message && <p className="mt-2 text-sm text-[var(--accent)]">{message}</p>}
        </div>
      </form>

      <section className="space-y-3">
        {users.map((user) => (
          <article key={user.id} className="glass rounded-[22px] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-[var(--muted)]">{user.email}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-[var(--muted)]">
                  {user.role} · {user.timezone}
                  {user.specialty ? ` · ${user.specialty}` : ""}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className={user.pushEnabled ? "text-[var(--green)]" : "text-[var(--muted)]"}>
                  {user.pushEnabled ? "Push on" : "Push off"}
                </p>
                <p className="text-[var(--muted)]">
                  {user.lastAvailability
                    ? `${statusLabel(user.lastAvailability.status as never)} (${user.lastAvailability.slots ?? "—"})`
                    : "No capacity yet"}
                </p>
                <button className="btn btn-secondary mt-2 !py-1.5 text-xs" onClick={() => toggleActive(user)}>
                  {user.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
