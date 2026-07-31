import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_NOTIFY_BODY, formatNotifyBody, greetingName } from "@/lib/notify";
import { sendPushToUser } from "@/lib/push";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appSettings =
    (await prisma.appSettings.findUnique({ where: { id: "default" } })) ??
    (await prisma.appSettings.create({ data: { id: "default" } }));
  const notifyBody = appSettings.notifyBody || DEFAULT_NOTIFY_BODY;

  const users = await prisma.user.findMany({
    where: {
      active: true,
      pushSubscriptions: { some: {} },
    },
    select: {
      id: true,
      name: true,
      role: true,
      pushSubscriptions: { select: { id: true } },
    },
  });

  const activeUserCount = await prisma.user.count({ where: { active: true } });

  let recipients = 0;
  let sent = 0;
  let failed = 0;
  const details: Array<{ name: string; role: Role; sent: number; failed: number }> = [];

  for (const user of users) {
    recipients += 1;
    const url =
      user.role === Role.THERAPIST
        ? "/therapist"
        : user.role === Role.PSYCHIATRIST
          ? "/psychiatrist"
          : "/admin";

    const result = await sendPushToUser(user.id, {
      title: "Referral Hub",
      body:
        user.role === Role.THERAPIST
          ? formatNotifyBody(notifyBody, user.name)
          : `Notification from Referral Hub for ${greetingName(user.name)}.`,
      url,
    });

    sent += result.sent;
    failed += result.failed;
    details.push({ name: user.name, role: user.role, sent: result.sent, failed: result.failed });
  }

  let lastBroadcastAt: string | null = null;
  if (sent > 0) {
    const broadcastAt = new Date();
    await prisma.appSettings.upsert({
      where: { id: "default" },
      create: { id: "default", lastBroadcastAt: broadcastAt },
      update: { lastBroadcastAt: broadcastAt },
    });
    lastBroadcastAt = broadcastAt.toISOString();
  }

  return NextResponse.json({
    ok: true,
    recipients,
    sent,
    failed,
    activeUserCount,
    pushEnabledCount: recipients,
    lastBroadcastAt,
    details,
  });
}
