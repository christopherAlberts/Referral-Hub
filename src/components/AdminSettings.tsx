"use client";

import { useEffect, useRef, useState } from "react";
import { NotifyFrequency } from "@prisma/client";
import {
  isPsychiatristViewMode,
  normalizePsychiatristBoardFilters,
  normalizePsychiatristProfileFields,
  normalizeTherapistProfileFields,
  parseHpcsaCategories,
  parseOptionList,
  parseTherapistOptionLists,
  PSYCHIATRIST_VIEWS,
  DEFAULT_AGE_GROUPS,
  DEFAULT_ASSESSMENT_TYPES,
  DEFAULT_GENDERS,
  DEFAULT_HOSPITAL_SETTINGS,
  DEFAULT_LANGUAGES,
  DEFAULT_PRACTICE_AREAS,
  type PsychiatristBoardFilterSetting,
  type PsychiatristProfileFieldSetting,
  type PsychiatristViewMode,
  type TherapistProfileFieldSetting,
} from "@/lib/therapist-fields";
import { OptionListEditor } from "@/components/OptionListEditor";

type Alert = {
  id?: string;
  label: string;
  timeLocal: string;
  frequency: NotifyFrequency;
  enabled: boolean;
  sortOrder?: number;
  lastSentAt?: string | null;
  nextScheduledAt?: string | null;
};

type Settings = {
  alerts: Alert[];
  notifyBody: string;
  lastSentAt?: string | null;
  nextScheduledAt?: string | null;
  scheduleTimezone?: string;
  pushEnabledCount?: number;
  psychiatristDefaultView: PsychiatristViewMode;
  psychiatristShowViewOptions: boolean;
  psychiatristBoardFilters: PsychiatristBoardFilterSetting[];
  hpcsaCategories: string[];
  hospitalSettings: string[];
  ageGroupOptions: string[];
  genderOptions: string[];
  languageOptions: string[];
  practiceAreaOptions: string[];
  assessmentTypeOptions: string[];
  psychiatristProfileFields: PsychiatristProfileFieldSetting[];
  therapistProfileFields: TherapistProfileFieldSetting[];
};

type SettingsTab = "view" | "profile" | "therapist" | "hpcsa" | "notifications";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "view", label: "Psychiatrist view" },
  { id: "profile", label: "Psychiatrist profile" },
  { id: "therapist", label: "Therapist profile" },
  { id: "hpcsa", label: "HPCSA categories" },
  { id: "notifications", label: "Notifications" },
];

const DEFAULT_NOTIFY_BODY = "Hi {{name}} — please update today’s patient capacity.";

function blankAlert(): Alert {
  return {
    label: "Capacity reminder",
    timeLocal: "08:00",
    frequency: NotifyFrequency.DAILY,
    enabled: true,
    lastSentAt: null,
    nextScheduledAt: null,
  };
}

function formatWhen(iso: string | null | undefined, timeZone?: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timeZone || undefined,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

function serializeSettings(settings: Settings) {
  return JSON.stringify({
    notifyBody: settings.notifyBody.trim(),
    psychiatristDefaultView: settings.psychiatristDefaultView,
    psychiatristShowViewOptions: settings.psychiatristShowViewOptions,
    psychiatristBoardFilters: settings.psychiatristBoardFilters.map((filter) => ({
      id: filter.id,
      visible: filter.visible,
    })),
    hpcsaCategories: settings.hpcsaCategories,
    hospitalSettings: settings.hospitalSettings,
    ageGroupOptions: settings.ageGroupOptions,
    genderOptions: settings.genderOptions,
    languageOptions: settings.languageOptions,
    practiceAreaOptions: settings.practiceAreaOptions,
    assessmentTypeOptions: settings.assessmentTypeOptions,
    psychiatristProfileFields: settings.psychiatristProfileFields.map((field) => ({
      id: field.id,
      visible: field.visible,
      required: field.required,
    })),
    therapistProfileFields: settings.therapistProfileFields.map((field) => ({
      id: field.id,
      visible: field.visible,
      required: field.required,
    })),
    alerts: settings.alerts.map((a, i) => ({
      id: a.id,
      label: a.label,
      timeLocal: a.timeLocal,
      frequency: a.frequency,
      enabled: a.enabled,
      sortOrder: i,
    })),
  });
}

export function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tab, setTab] = useState<SettingsTab>("view");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [draftCategory, setDraftCategory] = useState("");
  const [optionDrafts, setOptionDrafts] = useState({
    hospitalSettings: "",
    ageGroupOptions: "",
    genderOptions: "",
    languageOptions: "",
    practiceAreaOptions: "",
    assessmentTypeOptions: "",
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef("");
  const hydrated = useRef(false);

  function applySettingsPayload(data: { settings: Settings }) {
    const next: Settings = {
      alerts: data.settings.alerts ?? [],
      notifyBody: data.settings.notifyBody || DEFAULT_NOTIFY_BODY,
      lastSentAt: data.settings.lastSentAt ?? null,
      nextScheduledAt: data.settings.nextScheduledAt ?? null,
      scheduleTimezone: data.settings.scheduleTimezone,
      pushEnabledCount: data.settings.pushEnabledCount ?? 0,
      psychiatristDefaultView: isPsychiatristViewMode(data.settings.psychiatristDefaultView)
        ? data.settings.psychiatristDefaultView
        : "table",
      psychiatristShowViewOptions: Boolean(data.settings.psychiatristShowViewOptions),
      psychiatristBoardFilters: normalizePsychiatristBoardFilters(
        data.settings.psychiatristBoardFilters,
      ),
      ...parseTherapistOptionLists(data.settings),
      psychiatristProfileFields: normalizePsychiatristProfileFields(
        data.settings.psychiatristProfileFields,
      ),
      therapistProfileFields: normalizeTherapistProfileFields(data.settings.therapistProfileFields),
    };
    setSettings(next);
    lastSaved.current = serializeSettings(next);
  }

  async function loadSettings(opts?: { quiet?: boolean }) {
    if (!opts?.quiet) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.settings) {
        if (!opts?.quiet) {
          setError(typeof data.error === "string" ? data.error : "Could not load settings.");
          setSettings(null);
        }
        return;
      }
      applySettingsPayload(data);
      hydrated.current = true;
    } catch {
      if (!opts?.quiet) {
        setError("Could not load settings.");
        setSettings(null);
      }
    } finally {
      if (!opts?.quiet) setLoading(false);
    }
  }

  async function persistSettings(next: Settings) {
    const payload = serializeSettings(next);
    if (payload === lastSaved.current) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyBody: next.notifyBody.trim() || DEFAULT_NOTIFY_BODY,
          psychiatristDefaultView: next.psychiatristDefaultView,
          psychiatristShowViewOptions: next.psychiatristShowViewOptions,
          psychiatristBoardFilters: next.psychiatristBoardFilters.map((filter) => ({
            id: filter.id,
            visible: filter.visible,
          })),
          hpcsaCategories: parseHpcsaCategories(next.hpcsaCategories),
          hospitalSettings: parseOptionList(next.hospitalSettings, DEFAULT_HOSPITAL_SETTINGS),
          ageGroupOptions: parseOptionList(next.ageGroupOptions, DEFAULT_AGE_GROUPS),
          genderOptions: parseOptionList(next.genderOptions, DEFAULT_GENDERS),
          languageOptions: parseOptionList(next.languageOptions, DEFAULT_LANGUAGES),
          practiceAreaOptions: parseOptionList(next.practiceAreaOptions, DEFAULT_PRACTICE_AREAS),
          assessmentTypeOptions: parseOptionList(next.assessmentTypeOptions, DEFAULT_ASSESSMENT_TYPES),
          psychiatristProfileFields: next.psychiatristProfileFields.map((field) => ({
            id: field.id,
            visible: field.visible,
            required: field.required,
          })),
          therapistProfileFields: next.therapistProfileFields.map((field) => ({
            id: field.id,
            visible: field.visible,
            required: field.required,
          })),
          alerts: next.alerts.map((a, i) => ({
            id: a.id,
            label: a.label.trim() || "Capacity reminder",
            timeLocal: a.timeLocal,
            frequency: a.frequency,
            enabled: a.enabled,
            sortOrder: i,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.settings) {
        setMessage("Could not save changes.");
        return;
      }
      applySettingsPayload(data);
      setMessage("Saved");
      window.setTimeout(() => setMessage(null), 1500);
    } catch {
      setMessage("Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  function queueSave(next: Settings) {
    if (!hydrated.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persistSettings(next);
    }, 450);
  }

  function commit(next: Settings, immediate = false) {
    setSettings(next);
    if (immediate) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      void persistSettings(next);
    } else {
      queueSave(next);
    }
  }

  function updateAlert(index: number, patch: Partial<Alert>, immediate = false) {
    if (!settings) return;
    commit(
      { ...settings, alerts: settings.alerts.map((a, i) => (i === index ? { ...a, ...patch } : a)) },
      immediate,
    );
  }

  function updateNotifyBody(notifyBody: string) {
    if (!settings) return;
    commit({ ...settings, notifyBody });
  }

  function updateBoardSettings(
    patch: Partial<Pick<Settings, "psychiatristDefaultView" | "psychiatristShowViewOptions">>,
  ) {
    if (!settings) return;
    commit({ ...settings, ...patch }, true);
  }

  function updateBoardFilter(id: PsychiatristBoardFilterSetting["id"], visible: boolean) {
    if (!settings) return;
    commit(
      {
        ...settings,
        psychiatristBoardFilters: settings.psychiatristBoardFilters.map((filter) =>
          filter.id === id ? { ...filter, visible } : filter,
        ),
      },
      true,
    );
  }

  function updateProfileField(
    id: PsychiatristProfileFieldSetting["id"],
    patch: Partial<Pick<PsychiatristProfileFieldSetting, "visible" | "required">>,
  ) {
    if (!settings) return;
    commit(
      {
        ...settings,
        psychiatristProfileFields: settings.psychiatristProfileFields.map((field) => {
          if (field.id !== id) return field;
          const visible = patch.visible ?? field.visible;
          const required = visible ? (patch.required ?? field.required) : false;
          return { ...field, visible, required };
        }),
      },
      true,
    );
  }

  function updateTherapistProfileField(
    id: TherapistProfileFieldSetting["id"],
    patch: Partial<Pick<TherapistProfileFieldSetting, "visible" | "required">>,
  ) {
    if (!settings) return;
    commit(
      {
        ...settings,
        therapistProfileFields: settings.therapistProfileFields.map((field) => {
          if (field.id !== id) return field;
          const visible = patch.visible ?? field.visible;
          const required = visible ? (patch.required ?? field.required) : false;
          return { ...field, visible, required };
        }),
      },
      true,
    );
  }

  type OptionListKey =
    | "hospitalSettings"
    | "ageGroupOptions"
    | "genderOptions"
    | "languageOptions"
    | "practiceAreaOptions"
    | "assessmentTypeOptions";

  function updateOptionList(key: OptionListKey, next: string[], immediate = false) {
    if (!settings) return;
    commit({ ...settings, [key]: next }, immediate);
  }

  function addOption(key: OptionListKey) {
    if (!settings) return;
    const value = optionDrafts[key].trim();
    if (!value) return;
    if (settings[key].some((item) => item.toLowerCase() === value.toLowerCase())) {
      setOptionDrafts((prev) => ({ ...prev, [key]: "" }));
      return;
    }
    setOptionDrafts((prev) => ({ ...prev, [key]: "" }));
    updateOptionList(key, [...settings[key], value], true);
  }

  function updateHpcsaCategory(index: number, value: string) {
    if (!settings) return;
    const hpcsaCategories = settings.hpcsaCategories.map((item, i) => (i === index ? value : item));
    commit({ ...settings, hpcsaCategories });
  }

  function addHpcsaCategory() {
    if (!settings) return;
    const value = draftCategory.trim();
    if (!value) return;
    if (settings.hpcsaCategories.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setDraftCategory("");
      return;
    }
    setDraftCategory("");
    commit({ ...settings, hpcsaCategories: [...settings.hpcsaCategories, value] }, true);
  }

  function removeHpcsaCategory(index: number) {
    if (!settings || settings.hpcsaCategories.length <= 1) return;
    commit(
      {
        ...settings,
        hpcsaCategories: settings.hpcsaCategories.filter((_, i) => i !== index),
      },
      true,
    );
  }

  function addAlert() {
    if (!settings) return;
    commit({ ...settings, alerts: [...settings.alerts, blankAlert()] }, true);
  }

  function removeAlert(index: number) {
    if (!settings) return;
    commit({ ...settings, alerts: settings.alerts.filter((_, i) => i !== index) }, true);
  }

  useEffect(() => {
    loadSettings();
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  async function sendNow() {
    if (sending) return;
    const confirmed = window.confirm(
      "Send a push notification now to every user who has notifications enabled?",
    );
    if (!confirmed) return;

    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/push/send-now", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage("Could not send notifications.");
        return;
      }
      if (!data.recipients || data.sent === 0) {
        setMessage(
          `Nothing sent — ${data.pushEnabledCount ?? 0} of ${data.activeUserCount ?? 0} users have push enabled. Open the app on a phone/browser, install it, and tap Enable notifications while logged in.`,
        );
      } else {
        const applePart =
          typeof data.appleSent === "number"
            ? ` · iOS accepted ${data.appleSent}${data.appleFailed ? `, ${data.appleFailed} failed` : ""}`
            : "";
        setMessage(
          `Sent now to ${data.recipients} user${data.recipients === 1 ? "" : "s"} (${data.sent} delivery${data.sent === 1 ? "" : "ies"}${data.failed ? `, ${data.failed} failed` : ""}${applePart}).`,
        );
      }
      await loadSettings({ quiet: true });
    } catch {
      setMessage("Could not send notifications.");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p className="text-[var(--muted)]">Loading settings…</p>;

  if (error || !settings) {
    return (
      <div className="glass mx-auto max-w-xl space-y-3 rounded-[28px] p-5">
        <p className="text-[var(--red)]">{error ?? "Could not load settings."}</p>
        <button type="button" className="btn" onClick={() => loadSettings()}>
          Retry
        </button>
      </div>
    );
  }

  const tz = settings.scheduleTimezone;
  const previewBody = (settings.notifyBody.trim() || DEFAULT_NOTIFY_BODY).replaceAll(
    "{{name}}",
    "Frasier",
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="glass rounded-[28px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
              Settings
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Changes save automatically.</p>
          </div>
          <p className="text-xs font-medium text-[var(--muted)]">
            {saving ? "Saving…" : message === "Saved" ? "Saved" : ""}
          </p>
        </div>
        <nav className="mt-4 flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="chip"
              data-active={tab === item.id ? "true" : "false"}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </section>

      {tab === "view" && (
        <section className="glass space-y-4 rounded-[28px] p-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">Psychiatrist view</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Choose the default board layout. Other layouts stay hidden unless you turn them on.
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              Default layout
            </p>
            <div className="flex flex-wrap gap-2">
              {PSYCHIATRIST_VIEWS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="chip"
                  data-active={settings.psychiatristDefaultView === option.id ? "true" : "false"}
                  onClick={() => updateBoardSettings({ psychiatristDefaultView: option.id })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-start gap-3 rounded-2xl bg-white/55 p-4 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={settings.psychiatristShowViewOptions}
              onChange={(e) =>
                updateBoardSettings({ psychiatristShowViewOptions: e.target.checked })
              }
            />
            <span>
              <span className="font-semibold text-[var(--ink)]">Show other layout options</span>
              <span className="mt-1 block text-[var(--muted)]">
                When this is off, psychiatrists only see the default layout and the layout title is
                hidden.
              </span>
            </span>
          </label>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              Board filters
            </p>
            <p className="mb-3 text-sm text-[var(--muted)]">
              Choose which filters appear on the psychiatrist page. Hidden filters are not applied.
            </p>
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/55">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-xs uppercase tracking-[0.06em] text-[var(--muted)]">
                    <th className="px-4 py-3 font-semibold">Filter</th>
                    <th className="w-[88px] px-3 py-3 text-center font-semibold">Show</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.psychiatristBoardFilters.map((filter) => (
                    <tr key={filter.id} className="border-b border-[var(--line)] last:border-b-0">
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">{filter.label}</td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={filter.visible}
                          onChange={(e) => updateBoardFilter(filter.id, e.target.checked)}
                          aria-label={`Show ${filter.label}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {tab === "profile" && (
        <section className="glass space-y-4 rounded-[28px] p-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">Psychiatrist profile</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Choose which profile fields psychiatrists see, and which of those are compulsory.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/55">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-xs uppercase tracking-[0.06em] text-[var(--muted)]">
                  <th className="px-4 py-3 font-semibold">Field</th>
                  <th className="w-[88px] px-3 py-3 text-center font-semibold">Show</th>
                  <th className="w-[104px] px-3 py-3 text-center font-semibold">Required</th>
                </tr>
              </thead>
              <tbody>
                {settings.psychiatristProfileFields.map((field) => (
                  <tr key={field.id} className="border-b border-[var(--line)] last:border-b-0">
                    <td className="px-4 py-3 font-medium text-[var(--ink)]">{field.label}</td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={field.visible}
                        onChange={(e) => updateProfileField(field.id, { visible: e.target.checked })}
                        aria-label={`Show ${field.label}`}
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={field.required}
                        disabled={!field.visible || field.id === "email"}
                        onChange={(e) =>
                          updateProfileField(field.id, { required: e.target.checked })
                        }
                        aria-label={`Require ${field.label}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Email is always managed by an admin. Hidden fields stay in the account but are not shown
            on the psychiatrist profile.
          </p>
        </section>
      )}

      {tab === "therapist" && (
        <section className="glass space-y-5 rounded-[28px] p-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">Therapist profile</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Choose which profile fields therapists see, and which of those are compulsory.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/55">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-xs uppercase tracking-[0.06em] text-[var(--muted)]">
                  <th className="px-4 py-3 font-semibold">Field</th>
                  <th className="w-[88px] px-3 py-3 text-center font-semibold">Show</th>
                  <th className="w-[104px] px-3 py-3 text-center font-semibold">Required</th>
                </tr>
              </thead>
              <tbody>
                {settings.therapistProfileFields.map((field) => (
                  <tr key={field.id} className="border-b border-[var(--line)] last:border-b-0">
                    <td className="px-4 py-3 font-medium text-[var(--ink)]">{field.label}</td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={field.visible}
                        onChange={(e) =>
                          updateTherapistProfileField(field.id, { visible: e.target.checked })
                        }
                        aria-label={`Show ${field.label}`}
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={field.required}
                        disabled={!field.visible || field.id === "email"}
                        onChange={(e) =>
                          updateTherapistProfileField(field.id, { required: e.target.checked })
                        }
                        aria-label={`Require ${field.label}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Hidden fields stay in the account but are not shown on the therapist profile. HPCSA
            categories are edited in the HPCSA tab.
          </p>

          <OptionListEditor
            label="Hospital Setting"
            description="Options shown on the therapist profile and psychiatrist board filter."
            items={settings.hospitalSettings}
            draft={optionDrafts.hospitalSettings}
            onDraftChange={(value) => setOptionDrafts((prev) => ({ ...prev, hospitalSettings: value }))}
            onChangeItem={(index, value) =>
              updateOptionList(
                "hospitalSettings",
                settings.hospitalSettings.map((item, i) => (i === index ? value : item)),
              )
            }
            onAdd={() => addOption("hospitalSettings")}
            onRemove={(index) =>
              updateOptionList(
                "hospitalSettings",
                settings.hospitalSettings.filter((_, i) => i !== index),
                true,
              )
            }
          />
          <OptionListEditor
            label="Preferred patient age groups"
            items={settings.ageGroupOptions}
            draft={optionDrafts.ageGroupOptions}
            onDraftChange={(value) => setOptionDrafts((prev) => ({ ...prev, ageGroupOptions: value }))}
            onChangeItem={(index, value) =>
              updateOptionList(
                "ageGroupOptions",
                settings.ageGroupOptions.map((item, i) => (i === index ? value : item)),
              )
            }
            onAdd={() => addOption("ageGroupOptions")}
            onRemove={(index) =>
              updateOptionList(
                "ageGroupOptions",
                settings.ageGroupOptions.filter((_, i) => i !== index),
                true,
              )
            }
          />
          <OptionListEditor
            label="Gender"
            items={settings.genderOptions}
            draft={optionDrafts.genderOptions}
            onDraftChange={(value) => setOptionDrafts((prev) => ({ ...prev, genderOptions: value }))}
            onChangeItem={(index, value) =>
              updateOptionList(
                "genderOptions",
                settings.genderOptions.map((item, i) => (i === index ? value : item)),
              )
            }
            onAdd={() => addOption("genderOptions")}
            onRemove={(index) =>
              updateOptionList(
                "genderOptions",
                settings.genderOptions.filter((_, i) => i !== index),
                true,
              )
            }
          />
          <OptionListEditor
            label="Language"
            items={settings.languageOptions}
            draft={optionDrafts.languageOptions}
            onDraftChange={(value) => setOptionDrafts((prev) => ({ ...prev, languageOptions: value }))}
            onChangeItem={(index, value) =>
              updateOptionList(
                "languageOptions",
                settings.languageOptions.map((item, i) => (i === index ? value : item)),
              )
            }
            onAdd={() => addOption("languageOptions")}
            onRemove={(index) =>
              updateOptionList(
                "languageOptions",
                settings.languageOptions.filter((_, i) => i !== index),
                true,
              )
            }
          />
          <OptionListEditor
            label="Areas of practice"
            items={settings.practiceAreaOptions}
            draft={optionDrafts.practiceAreaOptions}
            onDraftChange={(value) =>
              setOptionDrafts((prev) => ({ ...prev, practiceAreaOptions: value }))
            }
            onChangeItem={(index, value) =>
              updateOptionList(
                "practiceAreaOptions",
                settings.practiceAreaOptions.map((item, i) => (i === index ? value : item)),
              )
            }
            onAdd={() => addOption("practiceAreaOptions")}
            onRemove={(index) =>
              updateOptionList(
                "practiceAreaOptions",
                settings.practiceAreaOptions.filter((_, i) => i !== index),
                true,
              )
            }
          />
          <OptionListEditor
            label="Types of assessment"
            items={settings.assessmentTypeOptions}
            draft={optionDrafts.assessmentTypeOptions}
            onDraftChange={(value) =>
              setOptionDrafts((prev) => ({ ...prev, assessmentTypeOptions: value }))
            }
            onChangeItem={(index, value) =>
              updateOptionList(
                "assessmentTypeOptions",
                settings.assessmentTypeOptions.map((item, i) => (i === index ? value : item)),
              )
            }
            onAdd={() => addOption("assessmentTypeOptions")}
            onRemove={(index) =>
              updateOptionList(
                "assessmentTypeOptions",
                settings.assessmentTypeOptions.filter((_, i) => i !== index),
                true,
              )
            }
          />
        </section>
      )}

      {tab === "hpcsa" && (
        <section className="glass space-y-4 rounded-[28px] p-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">HPCSA Registration Categories</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              These options appear on therapist profiles and as a filter on the psychiatrist board.
            </p>
          </div>
          <div className="space-y-2">
            {settings.hpcsaCategories.map((category, index) => (
              <div key={index} className="flex gap-2">
                <div className="field flex-1">
                  <input
                    aria-label={`Category ${index + 1}`}
                    value={category}
                    onChange={(e) => updateHpcsaCategory(index, e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary !px-3"
                  disabled={settings.hpcsaCategories.length <= 1}
                  onClick={() => removeHpcsaCategory(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="field flex-1">
              <label htmlFor="new-hpcsa">Add a category</label>
              <input
                id="new-hpcsa"
                value={draftCategory}
                placeholder="e.g. Clinical Psychologist"
                onChange={(e) => setDraftCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addHpcsaCategory();
                  }
                }}
              />
            </div>
            <button type="button" className="btn mt-6" onClick={addHpcsaCategory}>
              Add
            </button>
          </div>
        </section>
      )}

      {tab === "notifications" && (
        <>
          <section className="glass rounded-[28px] p-5">
            <h2 className="text-lg font-semibold text-[var(--ink)]">Notification settings</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Alerts fire in each therapist’s timezone.
            </p>
          </section>

          <section className="glass grid gap-3 rounded-[28px] p-5 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/55 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                Last sent
              </p>
              <p className="mt-1 text-lg font-semibold text-[var(--ink)]">
                {formatWhen(settings.lastSentAt, tz)}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Updates only when at least one push is delivered
              </p>
            </div>
            <div className="rounded-2xl bg-white/55 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                Next scheduled
              </p>
              <p className="mt-1 text-lg font-semibold text-[var(--ink)]">
                {formatWhen(settings.nextScheduledAt, tz)}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {(settings.pushEnabledCount ?? 0) === 0
                  ? "No users have push enabled yet"
                  : `${settings.pushEnabledCount} user${settings.pushEnabledCount === 1 ? "" : "s"} with push enabled`}
              </p>
            </div>
          </section>

          <section className="glass space-y-3 rounded-[28px] p-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--ink)]">Message wording</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Used for scheduled alerts and “Send notification now!” for therapists. Include{" "}
                <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs">{"{{name}}"}</code> where
                the therapist’s first name should appear.
              </p>
            </div>
            <div className="field">
              <label>Notification body</label>
              <textarea
                rows={3}
                value={settings.notifyBody}
                onChange={(e) => updateNotifyBody(e.target.value)}
                placeholder={DEFAULT_NOTIFY_BODY}
                maxLength={280}
              />
            </div>
            <div className="rounded-2xl bg-white/50 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                Preview
              </p>
              <p className="mt-1 text-[var(--ink)]">{previewBody}</p>
            </div>
          </section>

          <section className="space-y-3">
            {settings.alerts.length === 0 && (
              <p className="glass rounded-[22px] p-4 text-sm text-[var(--muted)]">
                No alerts yet. Add one to start sending capacity reminders.
              </p>
            )}
            {settings.alerts.map((alert, index) => (
              <article key={alert.id ?? `new-${index}`} className="glass space-y-3 rounded-[24px] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--muted)]">Alert {index + 1}</p>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={alert.enabled}
                        onChange={(e) => updateAlert(index, { enabled: e.target.checked }, true)}
                      />
                      On
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary !py-1.5 text-xs"
                      onClick={() => removeAlert(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="field sm:col-span-2">
                    <label>Label</label>
                    <input
                      value={alert.label}
                      onChange={(e) => updateAlert(index, { label: e.target.value })}
                      placeholder="Morning check-in"
                    />
                  </div>
                  <div className="field">
                    <label>Time</label>
                    <input
                      type="time"
                      value={alert.timeLocal}
                      onChange={(e) => updateAlert(index, { timeLocal: e.target.value }, true)}
                    />
                  </div>
                  <div className="field">
                    <label>Frequency</label>
                    <select
                      value={alert.frequency}
                      onChange={(e) =>
                        updateAlert(index, { frequency: e.target.value as NotifyFrequency }, true)
                      }
                    >
                      <option value={NotifyFrequency.DAILY}>Every day</option>
                      <option value={NotifyFrequency.WEEKDAYS}>Weekdays only</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-2 rounded-2xl bg-white/50 p-3 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-[var(--muted)]">Last sent: </span>
                    <span className="font-medium">{formatWhen(alert.lastSentAt, tz)}</span>
                  </p>
                  <p>
                    <span className="text-[var(--muted)]">Next: </span>
                    <span className="font-medium">
                      {alert.enabled ? formatWhen(alert.nextScheduledAt, tz) : "Off"}
                    </span>
                  </p>
                </div>
              </article>
            ))}
          </section>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary" onClick={addAlert}>
              Add alert
            </button>
            <button
              type="button"
              className="btn"
              style={{ background: "var(--accent)" }}
              disabled={sending}
              onClick={sendNow}
            >
              {sending ? "Sending…" : "Send notification now!"}
            </button>
          </div>
        </>
      )}

      {message && message !== "Saved" && (
        <p className="text-sm text-[var(--green)]">{message}</p>
      )}
    </div>
  );
}
