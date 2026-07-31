import { NextResponse } from "next/server";
import { NotifyFrequency, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";
import {
  dateStringInTimezone,
  isWeekdayInTimezone,
  localTimeHHMM,
  todayInTimezone,
} from "@/lib/timezone";

function minutesOf(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");

  if (!secret || (authHeader !== `Bearer ${secret}` && querySecret !== secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await prisma.notificationAlert.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: "asc" }, { timeLocal: "asc" }],
  });

  if (!alerts.length) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no_alerts" });
  }

  const therapists = await prisma.user.findMany({
    where: { role: Role.THERAPIST, active: true },
    include: { pushSubscriptions: true },
  });

  const results: Array<{ userId: string; name: string; alertId: string; status: string }> = [];

  for (const alert of alerts) {
    for (const therapist of therapists) {
      if (alert.frequency === NotifyFrequency.WEEKDAYS && !isWeekdayInTimezone(therapist.timezone)) {
        results.push({
          userId: therapist.id,
          name: therapist.name,
          alertId: alert.id,
          status: "skipped_weekend",
        });
        continue;
      }

      const nowHHMM = localTimeHHMM(therapist.timezone);
      const notifyMinutes = minutesOf(alert.timeLocal);
      const currentMinutes = minutesOf(nowHHMM);

      if (currentMinutes < notifyMinutes) {
        results.push({
          userId: therapist.id,
          name: therapist.name,
          alertId: alert.id,
          status: "too_early",
        });
        continue;
      }

      // 15-minute send window after each alert time
      if (currentMinutes - notifyMinutes > 15) {
        results.push({
          userId: therapist.id,
          name: therapist.name,
          alertId: alert.id,
          status: "window_passed",
        });
        continue;
      }

      const date = todayInTimezone(therapist.timezone);
      const already = await prisma.reminderLog.findUnique({
        where: {
          userId_alertId_date: { userId: therapist.id, alertId: alert.id, date },
        },
      });
      if (already) {
        results.push({
          userId: therapist.id,
          name: therapist.name,
          alertId: alert.id,
          status: "already_sent",
        });
        continue;
      }

      if (!therapist.pushSubscriptions.length) {
        await prisma.reminderLog.create({
          data: { userId: therapist.id, alertId: alert.id, date },
        });
        results.push({
          userId: therapist.id,
          name: therapist.name,
          alertId: alert.id,
          status: "no_subscription",
        });
        continue;
      }

      const { sent, failed } = await sendPushToUser(therapist.id, {
        title: alert.label || "Capacity check-in",
        body: `Hi ${therapist.name.split(" ")[0]} — please update today’s patient capacity.`,
        url: "/therapist",
      });

      await prisma.reminderLog.create({
        data: { userId: therapist.id, alertId: alert.id, date },
      });
      results.push({
        userId: therapist.id,
        name: therapist.name,
        alertId: alert.id,
        status: sent > 0 ? "sent" : `failed:${failed}`,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    dateHint: dateStringInTimezone("UTC"),
    alerts: alerts.map((a) => ({ id: a.id, label: a.label, timeLocal: a.timeLocal })),
    results,
  });
}
