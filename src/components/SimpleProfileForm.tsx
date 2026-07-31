"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { COMMON_TIMEZONES } from "@/lib/timezone";

type Profile = {
  name: string;
  timezone: string;
  avatarUrl: string | null;
  email: string;
};

export function SimpleProfileForm() {
  const { update } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) =>
        setProfile({
          name: data.name,
          timezone: data.timezone,
          avatarUrl: data.avatarUrl,
          email: data.email,
        }),
      )
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profile.name,
        timezone: profile.timezone,
        avatarUrl: profile.avatarUrl,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage("Could not save profile.");
      return;
    }
    await update({
      user: {
        name: profile.name,
        timezone: profile.timezone,
        avatarUrl: profile.avatarUrl,
      },
    });
    setMessage("Profile saved.");
  }

  if (!profile) return <p className="text-[var(--muted)]">Loading profile…</p>;

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-4">
      <section className="glass rounded-[28px] p-5">
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
          Your profile
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{profile.email}</p>
      </section>
      <section className="glass space-y-4 rounded-[28px] p-5">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="timezone">Timezone</label>
          <select
            id="timezone"
            value={profile.timezone}
            onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </section>
      <button className="btn" disabled={saving}>
        {saving ? "Saving…" : "Save profile"}
      </button>
      {message && <p className="text-sm text-[var(--green)]">{message}</p>}
    </form>
  );
}
