"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  enablePushNotifications,
  fetchPushEnabled,
  isIosDevice,
  isStandaloneDisplay,
  registerPushServiceWorker,
} from "@/lib/push-client";

const SNOOZE_KEY = "rh-push-snooze-until";
const SNOOZE_MS = 1000 * 60 * 60 * 12; // 12 hours — not forever

function isSnoozed() {
  const until = Number(localStorage.getItem(SNOOZE_KEY) || "0");
  return Number.isFinite(until) && until > Date.now();
}

function clearLegacyDismiss() {
  // Old builds hid the coach forever after "Later". Clear that so phones recover.
  localStorage.removeItem("rh-push-dismissed");
}

export function PushCoach() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  const ios = useMemo(() => isIosDevice(), []);
  const standalone = useMemo(() => isStandaloneDisplay(), []);

  useEffect(() => {
    if (status !== "authenticated") return;

    clearLegacyDismiss();

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    let cancelled = false;

    (async () => {
      try {
        await registerPushServiceWorker();
      } catch {
        // Banner can still offer enable; errors surface on tap.
      }

      const serverEnabled = await fetchPushEnabled();
      if (cancelled) return;

      // Permission already granted but server has no subscription — fix silently.
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        serverEnabled === false &&
        !(ios && !standalone)
      ) {
        const result = await enablePushNotifications();
        if (cancelled) return;
        if (result.ok) {
          setOpen(false);
          return;
        }
      }

      const needsPermission =
        typeof Notification === "undefined" || Notification.permission !== "granted";
      const needsServer = serverEnabled !== true;
      const needsIosInstall = ios && !standalone;
      const needsCoach = needsPermission || needsServer || needsIosInstall;

      if (!needsCoach) {
        setOpen(false);
        return;
      }

      setOpen(!isSnoozed());
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [status, ios, standalone]);

  if (status !== "authenticated" || !open || !session) return null;

  async function enableNotifications() {
    setBusy(true);
    setMessage(null);
    const result = await enablePushNotifications();
    if (result.ok) {
      localStorage.removeItem(SNOOZE_KEY);
      setMessage("Notifications enabled. You’re all set.");
      setTimeout(() => setOpen(false), 1200);
    } else {
      setMessage(result.message);
    }
    setBusy(false);
  }

  async function installAndroid() {
    // @ts-expect-error beforeinstallprompt
    if (deferredPrompt?.prompt) {
      // @ts-expect-error beforeinstallprompt
      await deferredPrompt.prompt();
      setDeferredPrompt(null);
    }
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-lg rise-in sm:inset-x-auto sm:right-4 sm:left-auto">
      <div className="glass rounded-[24px] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Turn on notifications</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {ios
                ? standalone
                  ? "Tap Enable so this phone can receive capacity reminders."
                  : "Add Referral Hub to your Home Screen (Share → Add to Home Screen), open it from the icon, then enable notifications."
                : "Installing the app does not turn on alerts by itself. Tap Enable notifications — Android will ask for permission."}
            </p>
          </div>
          <button
            className="text-sm text-[var(--muted)]"
            onClick={() => {
              localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
              setOpen(false);
            }}
          >
            Later
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {!ios && deferredPrompt && (
            <button className="btn btn-secondary !py-2 text-sm" onClick={installAndroid}>
              Install app
            </button>
          )}
          <button className="btn !py-2 text-sm" disabled={busy} onClick={enableNotifications}>
            {busy ? "Working…" : "Enable notifications"}
          </button>
        </div>
        {message && <p className="mt-2 text-sm text-[var(--accent)]">{message}</p>}
      </div>
    </div>
  );
}
