"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AvatarPicker } from "@/components/AvatarPicker";
import { enablePushNotifications } from "@/lib/push-client";
import { COMMON_TIMEZONES } from "@/lib/timezone";

type Profile = {
  name: string;
  email: string;
  timezone: string;
  avatarUrl: string | null;
  title: string | null;
  specialty: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  clinic: string | null;
  licenseNumber: string | null;
  bio: string | null;
  pushEnabled: boolean;
};

export function SimpleProfileForm() {
  const { update } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) =>
        setProfile({
          name: data.name ?? "",
          email: data.email ?? "",
          timezone: data.timezone ?? "Africa/Johannesburg",
          avatarUrl: data.avatarUrl ?? null,
          title: data.title ?? null,
          specialty: data.specialty ?? null,
          phone: data.phone ?? null,
          secondaryPhone: data.secondaryPhone ?? null,
          clinic: data.clinic ?? null,
          licenseNumber: data.licenseNumber ?? null,
          bio: data.bio ?? null,
          pushEnabled: Boolean(data.pushEnabled),
        }),
      )
      .catch(() => undefined);
  }, []);

  async function onEnablePush() {
    setEnablingPush(true);
    setMessage(null);
    const result = await enablePushNotifications();
    if (result.ok) {
      setProfile((prev) => (prev ? { ...prev, pushEnabled: true } : prev));
      setMessage("Notifications enabled.");
    } else {
      setMessage(result.message);
    }
    setEnablingPush(false);
  }

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
        title: profile.title,
        specialty: profile.specialty,
        phone: profile.phone,
        secondaryPhone: profile.secondaryPhone,
        clinic: profile.clinic,
        licenseNumber: profile.licenseNumber,
        bio: profile.bio,
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
        <p className="mt-1 text-sm text-[var(--muted)]">
          Contact and practice details for your psychiatrist account.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="text-xs text-[var(--muted)]">
            Push: {profile.pushEnabled ? "enabled" : "not enabled yet"}
          </p>
          <button
            type="button"
            className="btn !py-1.5 text-xs"
            disabled={enablingPush}
            onClick={onEnablePush}
          >
            {enablingPush
              ? "Working…"
              : profile.pushEnabled
                ? "Refresh notifications"
                : "Enable notifications"}
          </button>
        </div>
      </section>

      <section className="glass space-y-4 rounded-[28px] p-5">
        <AvatarPicker
          name={profile.name}
          avatarUrl={profile.avatarUrl}
          onChange={(file) => onAvatarChange(file)}
          onClear={() => setProfile({ ...profile, avatarUrl: null })}
        />

        <div className="field">
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            placeholder="e.g. Consultant Psychiatrist"
            value={profile.title ?? ""}
            onChange={(e) => setProfile({ ...profile, title: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={profile.email} disabled readOnly />
          <p className="text-xs text-[var(--muted)]">Email is managed by an admin.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="phone">Phone number</label>
            <input
              id="phone"
              type="tel"
              placeholder="+27 …"
              value={profile.phone ?? ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="secondaryPhone">Secondary number</label>
            <input
              id="secondaryPhone"
              type="tel"
              placeholder="Optional"
              value={profile.secondaryPhone ?? ""}
              onChange={(e) => setProfile({ ...profile, secondaryPhone: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="specialty">Specialty</label>
          <input
            id="specialty"
            placeholder="e.g. Adult psychiatry, Mood disorders"
            value={profile.specialty ?? ""}
            onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="clinic">Clinic / practice</label>
          <input
            id="clinic"
            placeholder="Practice or hospital name"
            value={profile.clinic ?? ""}
            onChange={(e) => setProfile({ ...profile, clinic: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="licenseNumber">License / registration number</label>
          <input
            id="licenseNumber"
            placeholder="Optional"
            value={profile.licenseNumber ?? ""}
            onChange={(e) => setProfile({ ...profile, licenseNumber: e.target.value })}
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
          <label htmlFor="bio">Bio / notes</label>
          <textarea
            id="bio"
            rows={4}
            placeholder="Short professional bio"
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
