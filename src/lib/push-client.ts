"use client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    window.navigator.standalone === true
  );
}

export async function registerPushServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser.");
  }
  return navigator.serviceWorker.register("/sw.js");
}

export type EnablePushResult =
  | { ok: true }
  | { ok: false; message: string };

/** Request permission, subscribe, and save the subscription on the server. */
export async function enablePushNotifications(): Promise<EnablePushResult> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Push is only available in the browser." };
  }

  if (isIosDevice() && !isStandaloneDisplay()) {
    return {
      ok: false,
      message:
        "On iPhone, open Referral Hub from your Home Screen icon first, then tap Enable.",
    };
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, message: "Push is not supported in this browser context." };
  }

  if (!("Notification" in window)) {
    return { ok: false, message: "Notifications are not supported in this browser." };
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    return {
      ok: false,
      message:
        "Notification permission was not granted. On Android: Settings → Apps → Referral Hub (or Chrome) → Notifications → Allow, then try again.",
    };
  }

  await registerPushServiceWorker();
  const reg = await navigator.serviceWorker.ready;
  // Ensure the latest SW (push handler) is controlling this Home Screen app.
  await reg.update().catch(() => undefined);

  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) {
    return { ok: false, message: "Missing VAPID public key on the server." };
  }

  // Always mint a fresh subscription — stale iOS endpoints can accept (201) but never show.
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    try {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: existing.endpoint }),
      });
    } catch {
      // continue; local unsubscribe still matters
    }
    await existing.unsubscribe().catch(() => undefined);
  }

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, message: "Browser did not return a valid push subscription." };
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return {
      ok: false,
      message:
        typeof data.error === "string"
          ? data.error
          : "Could not save notification subscription. Stay logged in and try again.",
    };
  }

  return { ok: true };
}

export async function fetchPushEnabled(): Promise<boolean | null> {
  try {
    const res = await fetch("/api/profile", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return Boolean(data.pushEnabled);
  } catch {
    return null;
  }
}
