"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AvatarPicker } from "@/components/AvatarPicker";
import { enablePushNotifications } from "@/lib/push-client";
import {
  normalizePsychiatristProfileFields,
  psychiatristFieldMap,
  type PsychiatristProfileFieldSetting,
} from "@/lib/therapist-fields";
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

function fieldLabel(field: PsychiatristProfileFieldSetting) {
  return field.required ? `${field.label} *` : field.label;
}

export function SimpleProfileForm() {
  const { update } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fields, setFields] = useState<PsychiatristProfileFieldSetting[]>(() =>
    normalizePsychiatristProfileFields([]),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
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
        });
        setFields(normalizePsychiatristProfileFields(data.psychiatristProfileFields));
      })
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
    const byId = psychiatristFieldMap(fields);
    if (byId.name.visible && byId.name.required && !profile.name.trim()) {
      setMessage("Please enter your full name.");
      return;
    }
    if (byId.whatsapp.visible && byId.whatsapp.required && !profile.phone?.trim()) {
      setMessage("Please enter a preferred number for WhatsApp communication.");
      return;
    }
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
      const data = await res.json().catch(() => ({}));
      setMessage(typeof data.error === "string" ? data.error : "Could not save profile.");
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

  const byId = psychiatristFieldMap(fields);
  const showWhatsapp = byId.whatsapp.visible;
  const showSecondary = byId.secondaryPhone.visible;

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
        {byId.avatar.visible && (
          <AvatarPicker
            name={profile.name}
            avatarUrl={profile.avatarUrl}
            onChange={(file) => onAvatarChange(file)}
            onClear={() => setProfile({ ...profile, avatarUrl: null })}
          />
        )}

        {byId.name.visible && (
          <div className="field">
            <label htmlFor="name">{fieldLabel(byId.name)}</label>
            <input
              id="name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              required={byId.name.required}
            />
          </div>
        )}

        {byId.title.visible && (
          <div className="field">
            <label htmlFor="title">{fieldLabel(byId.title)}</label>
            <input
              id="title"
              placeholder="e.g. Consultant Psychiatrist"
              value={profile.title ?? ""}
              onChange={(e) => setProfile({ ...profile, title: e.target.value })}
              required={byId.title.required}
            />
          </div>
        )}

        {byId.email.visible && (
          <div className="field">
            <label htmlFor="email">{fieldLabel(byId.email)}</label>
            <input id="email" type="email" value={profile.email} disabled readOnly />
            <p className="text-xs text-[var(--muted)]">Email is managed by an admin.</p>
          </div>
        )}

        {(showWhatsapp || showSecondary) && (
          <div className={`grid gap-3 ${showWhatsapp && showSecondary ? "sm:grid-cols-2" : ""}`}>
            {showWhatsapp && (
              <div className="field">
                <label htmlFor="phone">{fieldLabel(byId.whatsapp)}</label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+27 …"
                  value={profile.phone ?? ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  required={byId.whatsapp.required}
                />
              </div>
            )}
            {showSecondary && (
              <div className="field">
                <label htmlFor="secondaryPhone">{fieldLabel(byId.secondaryPhone)}</label>
                <input
                  id="secondaryPhone"
                  type="tel"
                  placeholder="Optional"
                  value={profile.secondaryPhone ?? ""}
                  onChange={(e) => setProfile({ ...profile, secondaryPhone: e.target.value })}
                  required={byId.secondaryPhone.required}
                />
              </div>
            )}
          </div>
        )}

        {byId.specialty.visible && (
          <div className="field">
            <label htmlFor="specialty">{fieldLabel(byId.specialty)}</label>
            <input
              id="specialty"
              placeholder="e.g. Adult psychiatry, Mood disorders"
              value={profile.specialty ?? ""}
              onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
              required={byId.specialty.required}
            />
          </div>
        )}

        {byId.clinic.visible && (
          <div className="field">
            <label htmlFor="clinic">{fieldLabel(byId.clinic)}</label>
            <input
              id="clinic"
              placeholder="Practice or hospital name"
              value={profile.clinic ?? ""}
              onChange={(e) => setProfile({ ...profile, clinic: e.target.value })}
              required={byId.clinic.required}
            />
          </div>
        )}

        {byId.licenseNumber.visible && (
          <div className="field">
            <label htmlFor="licenseNumber">{fieldLabel(byId.licenseNumber)}</label>
            <input
              id="licenseNumber"
              placeholder="Optional"
              value={profile.licenseNumber ?? ""}
              onChange={(e) => setProfile({ ...profile, licenseNumber: e.target.value })}
              required={byId.licenseNumber.required}
            />
          </div>
        )}

        {byId.timezone.visible && (
          <div className="field">
            <label htmlFor="timezone">{fieldLabel(byId.timezone)}</label>
            <select
              id="timezone"
              value={profile.timezone}
              onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
              required={byId.timezone.required}
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        )}

        {byId.bio.visible && (
          <div className="field">
            <label htmlFor="bio">{fieldLabel(byId.bio)}</label>
            <textarea
              id="bio"
              rows={4}
              placeholder="Short professional bio"
              value={profile.bio ?? ""}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              required={byId.bio.required}
            />
          </div>
        )}
      </section>

      <button className="btn" disabled={saving}>
        {saving ? "Saving…" : "Save profile"}
      </button>
      {message && <p className="text-sm text-[var(--green)]">{message}</p>}
    </form>
  );
}
