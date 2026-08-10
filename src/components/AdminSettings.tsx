"use client";

import { useEffect, useRef, useState } from "react";
import { NotifyFrequency } from "@prisma/client";

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
};

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

function serializeSettings(alerts: Alert[], notifyBody: string) {
  return JSON.stringify({
    notifyBody: notifyBody.trim(),
    alerts: alerts.map((a, i) => ({
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef("");
  const hydrated = useRef(false);

  function applySettingsPayload(data: { settings: Settings }) {
    const next = {
      alerts: data.settings.alerts ?? [],
      notifyBody: data.settings.notifyBody || DEFAULT_NOTIFY_BODY,
      lastSentAt: data.settings.lastSentAt ?? null,
      nextScheduledAt: data.settings.nextScheduledAt ?? null,
      scheduleTimezone: data.settings.scheduleTimezone,
      pushEnabledCount: data.settings.pushEnabledCount ?? 0,
    };
    setSettings(next);
    lastSaved.current = serializeSettings(next.alerts, next.notifyBody);
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

  async function persistSettings(alerts: Alert[], notifyBody: string) {
    const payload = serializeSettings(alerts, notifyBody);
    if (payload === lastSaved.current) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyBody: notifyBody.trim() || DEFAULT_NOTIFY_BODY,
          alerts: alerts.map((a, i) => ({
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

  function queueSave(alerts: Alert[], notifyBody: string) {
    if (!hydrated.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persistSettings(alerts, notifyBody);
    }, 450);
  }

  function updateAlert(index: number, patch: Partial<Alert>, immediate = false) {
    setSettings((prev) => {
      if (!prev) return prev;
      const alerts = prev.alerts.map((a, i) => (i === index ? { ...a, ...patch } : a));
      if (immediate) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        void persistSettings(alerts, prev.notifyBody);
      } else {
        queueSave(alerts, prev.notifyBody);
      }
      return { ...prev, alerts };
    });
  }

  function updateNotifyBody(notifyBody: string) {
    setSettings((prev) => {
      if (!prev) return prev;
      queueSave(prev.alerts, notifyBody);
      return { ...prev, notifyBody };
    });
  }

  function addAlert() {
    setSettings((prev) => {
      if (!prev) return prev;
      const alerts = [...prev.alerts, blankAlert()];
      if (saveTimer.current) clearTimeout(saveTimer.current);
      void persistSettings(alerts, prev.notifyBody);
      return { ...prev, alerts };
    });
  }

  function removeAlert(index: number) {
    setSettings((prev) => {
      if (!prev) return prev;
      const alerts = prev.alerts.filter((_, i) => i !== index);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      void persistSettings(alerts, prev.notifyBody);
      return { ...prev, alerts };
    });
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
              Notification settings
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Changes save automatically. Alerts fire in each therapist’s timezone.
            </p>
          </div>
          <p className="text-xs font-medium text-[var(--muted)]">
            {saving ? "Saving…" : message === "Saved" ? "Saved" : ""}
          </p>
        </div>
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
      {message && message !== "Saved" && (
        <p className="text-sm text-[var(--green)]">{message}</p>
      )}
    </div>
  );
}
