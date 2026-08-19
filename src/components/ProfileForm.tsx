"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AvatarPicker } from "@/components/AvatarPicker";
import { CheckboxGroup } from "@/components/CheckboxGroup";
import { enablePushNotifications } from "@/lib/push-client";
import {
  ALL_AGE_GROUPS,
  normalizeTherapistProfileFields,
  parseTherapistOptionLists,
  therapistFieldMap,
  type TherapistOptionLists,
  type TherapistProfileFieldSetting,
} from "@/lib/therapist-fields";
import { COMMON_TIMEZONES } from "@/lib/timezone";

type Profile = {
  name: string;
  timezone: string;
  avatarUrl: string | null;
  specialty: string | null;
  hospital: string | null;
  ageGroups: string[];
  gender: string | null;
  languages: string[];
  areasOfPractice: string[];
  offersAssessments: boolean | null;
  assessmentTypes: string[];
  bio: string | null;
  phone: string | null;
  email: string;
  pushEnabled: boolean;
};

function fieldLabel(field: TherapistProfileFieldSetting) {
  return field.required ? `${field.label} *` : field.label;
}

export function ProfileForm() {
  const { update } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fields, setFields] = useState<TherapistProfileFieldSetting[]>(() =>
    normalizeTherapistProfileFields([]),
  );
  const [options, setOptions] = useState<TherapistOptionLists>(() => parseTherapistOptionLists({}));
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile({
          name: data.name ?? "",
          timezone: data.timezone ?? "Africa/Johannesburg",
          avatarUrl: data.avatarUrl ?? null,
          specialty: data.specialty ?? null,
          hospital: data.hospital ?? null,
          ageGroups: data.ageGroups ?? [],
          gender: data.gender ?? null,
          languages: data.languages ?? [],
          areasOfPractice: data.areasOfPractice ?? [],
          offersAssessments: data.offersAssessments ?? null,
          assessmentTypes: data.assessmentTypes ?? [],
          bio: data.bio ?? null,
          phone: data.phone ?? null,
          email: data.email ?? "",
          pushEnabled: Boolean(data.pushEnabled),
        });
        setFields(normalizeTherapistProfileFields(data.therapistProfileFields));
        setOptions(parseTherapistOptionLists(data));
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
    const byId = therapistFieldMap(fields);
    if (byId.hpcsa.visible && byId.hpcsa.required && !profile.specialty?.trim()) {
      setMessage("Please select an HPCSA Registration Category.");
      return;
    }
    if (byId.hospital.visible && byId.hospital.required && !profile.hospital?.trim()) {
      setMessage("Please select a hospital setting.");
      return;
    }
    if (byId.ageGroups.visible && byId.ageGroups.required && profile.ageGroups.length === 0) {
      setMessage("Please select preferred patient age groups.");
      return;
    }
    if (byId.gender.visible && byId.gender.required && !profile.gender) {
      setMessage("Please select a gender.");
      return;
    }
    if (byId.languages.visible && byId.languages.required && profile.languages.length === 0) {
      setMessage("Please select a language.");
      return;
    }
    if (byId.areasOfPractice.visible && byId.areasOfPractice.required && profile.areasOfPractice.length === 0) {
      setMessage("Please select areas of practice.");
      return;
    }
    if (byId.assessments.visible && byId.assessments.required) {
      if (profile.offersAssessments == null) {
        setMessage("Please say whether you offer psychological assessments.");
        return;
      }
      if (profile.offersAssessments && profile.assessmentTypes.length === 0) {
        setMessage("Please select the types of assessment you offer.");
        return;
      }
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
        specialty: profile.specialty,
        hospital: profile.hospital,
        ageGroups: profile.ageGroups,
        gender: profile.gender,
        languages: profile.languages,
        areasOfPractice: profile.areasOfPractice,
        offersAssessments: profile.offersAssessments,
        assessmentTypes: profile.offersAssessments ? profile.assessmentTypes : [],
        bio: profile.bio,
        phone: profile.phone,
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

  const byId = therapistFieldMap(fields);

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-4">
      <section className="glass rounded-[28px] p-5">
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
          Your profile
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{profile.email}</p>
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

        {byId.email.visible && (
          <div className="field">
            <label htmlFor="email">{fieldLabel(byId.email)}</label>
            <input id="email" type="email" value={profile.email} disabled readOnly />
            <p className="text-xs text-[var(--muted)]">Email is managed by an admin.</p>
          </div>
        )}

        {byId.hpcsa.visible && (
          <div className="field">
            <label htmlFor="specialty">{fieldLabel(byId.hpcsa)}</label>
            <select
              id="specialty"
              value={profile.specialty ?? ""}
              onChange={(e) => setProfile({ ...profile, specialty: e.target.value || null })}
              required={byId.hpcsa.required}
            >
              <option value="">Select a category</option>
              {options.hpcsaCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
              {profile.specialty && !options.hpcsaCategories.includes(profile.specialty) && (
                <option value={profile.specialty}>{profile.specialty}</option>
              )}
            </select>
          </div>
        )}

        {byId.hospital.visible && (
          <div className="field">
            <label htmlFor="hospital">{fieldLabel(byId.hospital)}</label>
            <select
              id="hospital"
              value={profile.hospital ?? ""}
              onChange={(e) => setProfile({ ...profile, hospital: e.target.value || null })}
              required={byId.hospital.required}
            >
              <option value="">Select a hospital setting</option>
              {options.hospitalSettings.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              {profile.hospital && !options.hospitalSettings.includes(profile.hospital) && (
                <option value={profile.hospital}>{profile.hospital}</option>
              )}
            </select>
          </div>
        )}

        {byId.ageGroups.visible && (
          <div className="field">
            <span>{fieldLabel(byId.ageGroups)}</span>
            <CheckboxGroup
              options={options.ageGroupOptions}
              values={profile.ageGroups}
              exclusiveValue={ALL_AGE_GROUPS}
              onChange={(ageGroups) => setProfile({ ...profile, ageGroups })}
            />
          </div>
        )}

        {byId.gender.visible && (
          <div className="field">
            <span>{fieldLabel(byId.gender)}</span>
            <div className="flex flex-wrap gap-3 rounded-2xl bg-white/55 p-3">
              {options.genderOptions.map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="gender"
                    checked={profile.gender === option}
                    onChange={() => setProfile({ ...profile, gender: option })}
                    required={byId.gender.required}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        )}

        {byId.languages.visible && (
          <div className="field">
            <span>{fieldLabel(byId.languages)}</span>
            <CheckboxGroup
              options={options.languageOptions}
              values={profile.languages}
              onChange={(languages) => setProfile({ ...profile, languages })}
            />
          </div>
        )}

        {byId.areasOfPractice.visible && (
          <div className="field">
            <span>{fieldLabel(byId.areasOfPractice)}</span>
            <p className="text-xs text-[var(--muted)]">Select all that apply</p>
            <CheckboxGroup
              options={options.practiceAreaOptions}
              values={profile.areasOfPractice}
              onChange={(areasOfPractice) => setProfile({ ...profile, areasOfPractice })}
            />
          </div>
        )}

        {byId.assessments.visible && (
          <div className="space-y-3">
            <div className="field">
              <span>{fieldLabel(byId.assessments)}</span>
              <p className="text-sm text-[var(--ink)]">Offers psychological assessments?</p>
              <div className="flex flex-wrap gap-3 rounded-2xl bg-white/55 p-3">
                {[
                  [true, "Yes"],
                  [false, "No"],
                ].map(([value, label]) => (
                  <label key={String(value)} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="offersAssessments"
                      checked={profile.offersAssessments === value}
                      onChange={() =>
                        setProfile({
                          ...profile,
                          offersAssessments: value as boolean,
                          assessmentTypes: value ? profile.assessmentTypes : [],
                        })
                      }
                      required={byId.assessments.required}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            {profile.offersAssessments && (
              <div className="field">
                <span>Types of assessment{byId.assessments.required ? " *" : ""}</span>
                <p className="text-xs text-[var(--muted)]">Select all that apply</p>
                <CheckboxGroup
                  options={options.assessmentTypeOptions}
                  values={profile.assessmentTypes}
                  onChange={(assessmentTypes) => setProfile({ ...profile, assessmentTypes })}
                />
              </div>
            )}
          </div>
        )}

        {byId.phone.visible && (
          <div className="field">
            <label htmlFor="phone">{fieldLabel(byId.phone)}</label>
            <input
              id="phone"
              value={profile.phone ?? ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              required={byId.phone.required}
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
