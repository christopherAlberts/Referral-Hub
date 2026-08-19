"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Role } from "@prisma/client";
import { hospitalLabel, parseHpcsaCategories, parseHospitalSettings } from "@/lib/therapist-fields";
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
  hospital: string | null;
  pushEnabled: boolean;
  lastAvailability: {
    date: string;
    status: string;
    slots: number | null;
    updatedAt: string;
  } | null;
};

type RoleFilter = "ALL" | Role;
type ActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";
type PushFilter = "ALL" | "ON" | "OFF";

const emptyForm = {
  email: "",
  name: "",
  role: Role.THERAPIST as Role,
  timezone: "Africa/Johannesburg",
  password: "",
  specialty: "",
  hospital: "",
  bio: "",
  phone: "",
};

export function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ALL");
  const [pushFilter, setPushFilter] = useState<PushFilter>("ALL");
  const [hpcsaCategories, setHpcsaCategories] = useState<string[]>(() => parseHpcsaCategories(null));
  const [hospitalSettings, setHospitalSettings] = useState<string[]>(() => parseHospitalSettings(null));

  async function load() {
    const res = await fetch("/api/users");
    if (!res.ok) return;
    const data = await res.json();
    setUsers(data.users ?? []);
  }

  useEffect(() => {
    load();
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.hpcsaCategories) {
          setHpcsaCategories(parseHpcsaCategories(data.settings.hpcsaCategories));
        }
        if (data.settings?.hospitalSettings) {
          setHospitalSettings(parseHospitalSettings(data.settings.hospitalSettings));
        }
      })
      .catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    let rows = [...users];
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.specialty ?? "").toLowerCase().includes(q) ||
          (hospitalLabel(u.hospital) ?? "").toLowerCase().includes(q) ||
          u.timezone.toLowerCase().includes(q),
      );
    }
    if (roleFilter !== "ALL") rows = rows.filter((u) => u.role === roleFilter);
    if (activeFilter === "ACTIVE") rows = rows.filter((u) => u.active);
    if (activeFilter === "INACTIVE") rows = rows.filter((u) => !u.active);
    if (pushFilter === "ON") rows = rows.filter((u) => u.pushEnabled);
    if (pushFilter === "OFF") rows = rows.filter((u) => !u.pushEnabled);
    return rows;
  }, [users, query, roleFilter, activeFilter, pushFilter]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        specialty: form.specialty || undefined,
        hospital: form.hospital || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(typeof data.error === "string" ? data.error : "Could not create user");
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
          <>
            <div className="field">
              <label>HPCSA Registration Category</label>
              <select
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              >
                <option value="">Select a category</option>
                {hpcsaCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Hospital</label>
              <select
                value={form.hospital}
                onChange={(e) => setForm({ ...form, hospital: e.target.value })}
              >
                <option value="">Select a hospital</option>
                {hospitalSettings.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="md:col-span-2">
          <button className="btn" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
          {message && <p className="mt-2 text-sm text-[var(--accent)]">{message}</p>}
        </div>
      </form>

      <section className="glass space-y-4 rounded-[28px] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="field max-w-md flex-1">
            <label htmlFor="user-search">Search users</label>
            <input
              id="user-search"
              placeholder="Name, email, category, hospital, timezone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <p className="text-sm text-[var(--muted)]">
            Showing {filtered.length} of {users.length}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["ALL", "All roles"],
              [Role.THERAPIST, "Therapists"],
              [Role.PSYCHIATRIST, "Psychiatrists"],
              [Role.ADMIN, "Admins"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="chip"
              data-active={roleFilter === value ? "true" : "false"}
              onClick={() => setRoleFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["ALL", "All status"],
              ["ACTIVE", "Active"],
              ["INACTIVE", "Inactive"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="chip"
              data-active={activeFilter === value ? "true" : "false"}
              onClick={() => setActiveFilter(value)}
            >
              {label}
            </button>
          ))}
          {(
            [
              ["ALL", "All push"],
              ["ON", "Push on"],
              ["OFF", "Push off"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="chip"
              data-active={pushFilter === value ? "true" : "false"}
              onClick={() => setPushFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        {filtered.length === 0 ? (
          <p className="glass rounded-[22px] p-4 text-sm text-[var(--muted)]">
            No users match these filters.
          </p>
        ) : (
          filtered.map((user) => (
            <article
              key={user.id}
              className="glass rounded-[22px] p-4"
              style={{ opacity: user.active ? 1 : 0.65 }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-[var(--muted)]">{user.email}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-[var(--muted)]">
                    {user.role} · {user.timezone}
                    {user.specialty ? ` · ${user.specialty}` : ""}
                    {user.hospital ? ` · ${hospitalLabel(user.hospital)}` : ""}
                    {!user.active ? " · inactive" : ""}
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
                  <button
                    className="btn btn-secondary mt-2 !py-1.5 text-xs"
                    onClick={() => toggleActive(user)}
                  >
                    {user.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
