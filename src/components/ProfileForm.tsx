"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AvatarPicker } from "@/components/AvatarPicker";
import { COMMON_TIMEZONES } from "@/lib/timezone";

type Profile = {
  name: string;
  timezone: string;
  avatarUrl: string | null;
  specialty: string | null;
  bio: string | null;
  phone: string | null;
  email: string;
  pushEnabled: boolean;
};

export function ProfileForm() {
  const { update } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => undefined);
  }, []);

  async function onAvatarChange(file: File | null) {
    if (!file || !profile) return;
    if (file.size > 1_200_000) {
      setMessage("Please use an image under ~1MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfile({ ...profile, avatarUrl: String(reader.result) });
    };
    reader.readAsDataURL(file);
  }

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
        specialty: profile.specialty,
        bio: profile.bio,
        phone: profile.phone,
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
        <p className="mt-2 text-xs text-[var(--muted)]">
          Push: {profile.pushEnabled ? "enabled" : "not enabled yet"}
        </p>
      </section>

      <section className="glass space-y-4 rounded-[28px] p-5">
        <AvatarPicker
          name={profile.name}
          avatarUrl={profile.avatarUrl}
          onChange={(file) => onAvatarChange(file)}
          onClear={() => setProfile({ ...profile, avatarUrl: null })}
        />

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
          <label htmlFor="specialty">Specialty</label>
          <input
            id="specialty"
            value={profile.specialty ?? ""}
            onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            value={profile.phone ?? ""}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
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
        <div className="field">
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            rows={4}
            value={profile.bio ?? ""}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          />
        </div>
      </section>

      <button className="btn" disabled={saving}>
        {saving ? "Saving…" : "Save profile"}
      </button>
      {message && <p className="text-sm text-[var(--green)]">{message}</p>}
    </form>
  );
}
