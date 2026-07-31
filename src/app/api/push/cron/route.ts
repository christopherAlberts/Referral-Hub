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

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");

  if (!secret || (authHeader !== `Bearer ${secret}` && querySecret !== secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  if (!settings?.notifyEnabled) {
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled" });
  }

  const therapists = await prisma.user.findMany({
    where: { role: Role.THERAPIST, active: true },
    include: { pushSubscriptions: true },
  });

  const results: Array<{ userId: string; name: string; status: string }> = [];

  for (const therapist of therapists) {
    if (settings.frequency === NotifyFrequency.WEEKDAYS && !isWeekdayInTimezone(therapist.timezone)) {
      results.push({ userId: therapist.id, name: therapist.name, status: "skipped_weekend" });
      continue;
    }

    const nowHHMM = localTimeHHMM(therapist.timezone);
    if (nowHHMM < settings.notifyTimeLocal) {
      results.push({ userId: therapist.id, name: therapist.name, status: "too_early" });
      continue;
    }

    // Only send within a 15-minute window after notify time to avoid late-day spam if cron was down
    const [nh, nm] = settings.notifyTimeLocal.split(":").map(Number);
    const [ch, cm] = nowHHMM.split(":").map(Number);
    const notifyMinutes = nh * 60 + nm;
    const currentMinutes = ch * 60 + cm;
    if (currentMinutes - notifyMinutes > 15) {
      results.push({ userId: therapist.id, name: therapist.name, status: "window_passed" });
      continue;
    }

    const date = todayInTimezone(therapist.timezone);
    const already = await prisma.reminderLog.findUnique({
      where: { userId_date: { userId: therapist.id, date } },
    });
    if (already) {
      results.push({ userId: therapist.id, name: therapist.name, status: "already_sent" });
      continue;
    }

    if (!therapist.pushSubscriptions.length) {
      await prisma.reminderLog.create({ data: { userId: therapist.id, date } });
      results.push({ userId: therapist.id, name: therapist.name, status: "no_subscription" });
      continue;
    }

    const { sent, failed } = await sendPushToUser(therapist.id, {
      title: "Capacity check-in",
      body: `Good morning ${therapist.name.split(" ")[0]} — please update today’s patient capacity.`,
      url: "/therapist",
    });

    await prisma.reminderLog.create({ data: { userId: therapist.id, date } });
    results.push({
      userId: therapist.id,
      name: therapist.name,
      status: sent > 0 ? "sent" : `failed:${failed}`,
    });
  }

  return NextResponse.json({
    ok: true,
    dateHint: dateStringInTimezone("UTC"),
    notifyTime: settings.notifyTimeLocal,
    results,
  });
}
