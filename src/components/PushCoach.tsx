"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    window.navigator.standalone === true
  );
}

export function PushCoach() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  const ios = useMemo(() => isIos(), []);
  const standalone = useMemo(() => isStandalone(), []);

  useEffect(() => {
    if (status !== "authenticated") return;
    const dismissed = localStorage.getItem("rh-push-dismissed");
    if (dismissed === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const needsCoach =
      Notification.permission !== "granted" || (ios && !standalone);
    setOpen(needsCoach);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [status, ios, standalone]);

  if (status !== "authenticated" || !open || !session) return null;

  async function enableNotifications() {
    setBusy(true);
    setMessage(null);
    try {
      if (ios && !isStandalone()) {
        setMessage("On iPhone, open Referral Hub from your Home Screen icon first, then tap Enable.");
        setBusy(false);
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setMessage("Push is not supported in this browser context.");
        setBusy(false);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notification permission was not granted.");
        setBusy(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("Missing VAPID public key");

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      const json = subscription.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });

      setMessage("Notifications enabled. You’re all set.");
      localStorage.setItem("rh-push-dismissed", "1");
      setTimeout(() => setOpen(false), 1200);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not enable notifications");
    } finally {
      setBusy(false);
    }
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
            <p className="text-sm font-semibold">Install & notifications</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {ios
                ? standalone
                  ? "Enable push so you get the morning capacity reminder."
                  : "Add Referral Hub to your Home Screen (Share → Add to Home Screen), open it from the icon, then enable notifications."
                : "Install the app and enable notifications for daily capacity reminders."}
            </p>
          </div>
          <button
            className="text-sm text-[var(--muted)]"
            onClick={() => {
              localStorage.setItem("rh-push-dismissed", "1");
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
