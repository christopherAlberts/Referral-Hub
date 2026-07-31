import { NextResponse } from "next/server";
import { NotifyFrequency, Role } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nextAlertOccurrence, SCHEDULE_DISPLAY_TZ } from "@/lib/timezone";

const alertSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(80),
  timeLocal: z.string().regex(/^\d{2}:\d{2}$/),
  frequency: z.nativeEnum(NotifyFrequency),
  enabled: z.boolean(),
  sortOrder: z.number().int().optional(),
});

const schema = z.object({
  alerts: z.array(alertSchema).min(0).max(20),
});

async function buildSettingsPayload() {
  const settings =
    (await prisma.appSettings.findUnique({ where: { id: "default" } })) ??
    (await prisma.appSettings.create({
      data: { id: "default" },
    }));

  const alerts = await prisma.notificationAlert.findMany({
    orderBy: [{ sortOrder: "asc" }, { timeLocal: "asc" }],
  });

  const lastLogs = await prisma.reminderLog.groupBy({
    by: ["alertId"],
    _max: { sentAt: true },
  });
  const lastByAlert = new Map(lastLogs.map((row) => [row.alertId, row._max.sentAt]));

  const latestCron = await prisma.reminderLog.findFirst({
    orderBy: { sentAt: "desc" },
    select: { sentAt: true },
  });

  const lastSentCandidates = [settings.lastBroadcastAt, latestCron?.sentAt].filter(
    (d): d is Date => Boolean(d),
  );
  const lastSentAt =
    lastSentCandidates.length > 0
      ? new Date(Math.max(...lastSentCandidates.map((d) => d.getTime())))
      : null;

  const enriched = alerts.map((alert) => {
    const lastSentAtForAlert = lastByAlert.get(alert.id) ?? null;
    const nextScheduledAt = alert.enabled
        ? nextAlertOccurrence(alert.timeLocal, alert.frequency, SCHEDULE_DISPLAY_TZ).toISOString()
        : null;

    return {
      ...alert,
      lastSentAt: lastSentAtForAlert?.toISOString() ?? null,
      nextScheduledAt,
    };
  });

  const upcoming = enriched
    .filter((a) => a.nextScheduledAt)
    .map((a) => a.nextScheduledAt as string)
    .sort();

  const pushEnabledCount = await prisma.user.count({
    where: { active: true, pushSubscriptions: { some: {} } },
  });

  return {
    ...settings,
    lastBroadcastAt: settings.lastBroadcastAt?.toISOString() ?? null,
    lastSentAt: lastSentAt?.toISOString() ?? null,
    nextScheduledAt: upcoming[0] ?? null,
    scheduleTimezone: SCHEDULE_DISPLAY_TZ,
    pushEnabledCount,
    alerts: enriched,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== Role.ADMIN && session.user.role !== Role.THERAPIST)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await buildSettingsPayload();
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { alerts } = parsed.data;

  await prisma.appSettings.upsert({
    where: { id: "default" },
    create: { id: "default", notifyEnabled: true },
    update: { notifyEnabled: true },
  });

  const existing = await prisma.notificationAlert.findMany({ select: { id: true } });
  const keepIds = new Set(alerts.map((a) => a.id).filter(Boolean) as string[]);
  const toDelete = existing.filter((a) => !keepIds.has(a.id)).map((a) => a.id);

  if (toDelete.length) {
    await prisma.notificationAlert.deleteMany({ where: { id: { in: toDelete } } });
  }

  for (let i = 0; i < alerts.length; i++) {
    const alert = alerts[i];
    if (alert.id && keepIds.has(alert.id)) {
      await prisma.notificationAlert.update({
        where: { id: alert.id },
        data: {
          label: alert.label,
          timeLocal: alert.timeLocal,
          frequency: alert.frequency,
          enabled: alert.enabled,
          sortOrder: alert.sortOrder ?? i,
        },
      });
    } else {
      await prisma.notificationAlert.create({
        data: {
          label: alert.label,
          timeLocal: alert.timeLocal,
          frequency: alert.frequency,
          enabled: alert.enabled,
          sortOrder: alert.sortOrder ?? i,
        },
      });
    }
  }

  const settings = await buildSettingsPayload();
  return NextResponse.json({ settings });
}
