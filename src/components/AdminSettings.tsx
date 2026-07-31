"use client";

import { FormEvent, useEffect, useState } from "react";
import { NotifyFrequency } from "@prisma/client";

type Settings = {
  notifyEnabled: boolean;
  notifyTimeLocal: string;
  frequency: NotifyFrequency;
};

export function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setSettings(data.settings))
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage("Could not save settings.");
      return;
    }
    const data = await res.json();
    setSettings(data.settings);
    setMessage("Settings saved. Reminders use each therapist’s timezone.");
  }

  if (!settings) return <p className="text-[var(--muted)]">Loading settings…</p>;

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-4">
      <section className="glass rounded-[28px] p-5">
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
          Notification settings
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Morning reminders go out at this clock time in each therapist’s own timezone.
        </p>
      </section>

      <section className="glass space-y-4 rounded-[28px] p-5">
        <label className="flex items-center justify-between gap-3">
          <span className="font-medium">Enable reminders</span>
          <input
            type="checkbox"
            checked={settings.notifyEnabled}
            onChange={(e) => setSettings({ ...settings, notifyEnabled: e.target.checked })}
          />
        </label>
        <div className="field">
          <label htmlFor="time">Time of day</label>
          <input
            id="time"
            type="time"
            value={settings.notifyTimeLocal}
            onChange={(e) => setSettings({ ...settings, notifyTimeLocal: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="frequency">How regularly</label>
          <select
            id="frequency"
            value={settings.frequency}
            onChange={(e) =>
              setSettings({ ...settings, frequency: e.target.value as NotifyFrequency })
            }
          >
            <option value={NotifyFrequency.DAILY}>Every day</option>
            <option value={NotifyFrequency.WEEKDAYS}>Weekdays only</option>
          </select>
        </div>
      </section>

      <button className="btn" disabled={saving}>
        {saving ? "Saving…" : "Save settings"}
      </button>
      {message && <p className="text-sm text-[var(--green)]">{message}</p>}
    </form>
  );
}
