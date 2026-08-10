import https from "https";
import webpush from "web-push";
import { prisma } from "@/lib/db";

const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
// Apple rejects reserved TLDs like .test in the VAPID subject (BadJwtToken).
const subject =
  process.env.VAPID_SUBJECT ?? "mailto:admin@streblainnovations.com";

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

/** Prefer IPv4 — some Apple push A/AAAA records hang on connect from this host. */
const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

function endpointHost(endpoint: string) {
  try {
    return new URL(endpoint).host;
  } catch {
    return "invalid";
  }
}

function isAppleEndpoint(endpoint: string) {
  return endpointHost(endpoint).includes("push.apple.com");
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subscriptions.length) {
    return { sent: 0, failed: 0, appleSent: 0, appleFailed: 0, otherSent: 0, otherFailed: 0 };
  }

  let sent = 0;
  let failed = 0;
  let appleSent = 0;
  let appleFailed = 0;
  let otherSent = 0;
  let otherFailed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      const apple = isAppleEndpoint(sub.endpoint);
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
          {
            TTL: 60 * 60 * 12,
            urgency: "high",
            timeout: 20_000,
            agent: ipv4Agent,
          },
        );
        sent += 1;
        if (apple) appleSent += 1;
        else otherSent += 1;
      } catch (err: unknown) {
        failed += 1;
        if (apple) appleFailed += 1;
        else otherFailed += 1;
        const statusCode =
          typeof err === "object" && err && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        const body =
          typeof err === "object" && err && "body" in err
            ? String((err as { body?: unknown }).body ?? "")
            : "";
        console.error("[push] send failed", {
          endpointHost: endpointHost(sub.endpoint),
          statusCode,
          body: body.slice(0, 200),
          message: err instanceof Error ? err.message : String(err),
        });
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
        }
      }
    }),
  );

  return { sent, failed, appleSent, appleFailed, otherSent, otherFailed };
}
