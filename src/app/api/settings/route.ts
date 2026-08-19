import { NextResponse } from "next/server";
import { NotifyFrequency, Role } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_NOTIFY_BODY } from "@/lib/notify";
import {
  isPsychiatristViewMode,
  normalizePsychiatristBoardFilters,
  normalizePsychiatristProfileFields,
  normalizeTherapistProfileFields,
  parseHpcsaCategories,
  parseTherapistOptionLists,
  parseOptionList,
  DEFAULT_AGE_GROUPS,
  DEFAULT_ASSESSMENT_TYPES,
  DEFAULT_GENDERS,
  DEFAULT_HOSPITAL_SETTINGS,
  DEFAULT_LANGUAGES,
  DEFAULT_PRACTICE_AREAS,
} from "@/lib/therapist-fields";
import { nextAlertOccurrence, SCHEDULE_DISPLAY_TZ } from "@/lib/timezone";

const alertSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(80),
  timeLocal: z.string().regex(/^\d{2}:\d{2}$/),
  frequency: z.nativeEnum(NotifyFrequency),
  enabled: z.boolean(),
  sortOrder: z.number().int().optional(),
});

const profileFieldSchema = z.object({
  id: z.enum([
    "name",
    "email",
    "whatsapp",
    "avatar",
    "title",
    "secondaryPhone",
    "specialty",
    "clinic",
    "licenseNumber",
    "timezone",
    "bio",
  ]),
  visible: z.boolean(),
  required: z.boolean(),
});

const therapistFieldSchema = z.object({
  id: z.enum([
    "name",
    "email",
    "phone",
    "avatar",
    "timezone",
    "bio",
    "hpcsa",
    "hospital",
    "ageGroups",
    "gender",
    "languages",
    "areasOfPractice",
    "assessments",
  ]),
  visible: z.boolean(),
  required: z.boolean(),
});

const optionListSchema = z.array(z.string().min(1).max(160)).min(1).max(40);

const schema = z.object({
  alerts: z.array(alertSchema).min(0).max(20).optional(),
  notifyBody: z.string().min(1).max(280).optional(),
  psychiatristDefaultView: z.enum(["table", "three", "one"]).optional(),
  psychiatristShowViewOptions: z.boolean().optional(),
  hpcsaCategories: optionListSchema.optional(),
  psychiatristProfileFields: z.array(profileFieldSchema).min(1).max(20).optional(),
  therapistProfileFields: z.array(therapistFieldSchema).min(1).max(20).optional(),
  hospitalSettings: optionListSchema.optional(),
  ageGroupOptions: optionListSchema.optional(),
  genderOptions: optionListSchema.optional(),
  languageOptions: optionListSchema.optional(),
  practiceAreaOptions: optionListSchema.optional(),
  assessmentTypeOptions: optionListSchema.optional(),
  psychiatristBoardFilters: z
    .array(
      z.object({
        id: z.enum([
          "search",
          "sort",
          "status",
          "hpcsa",
          "hospital",
          "ageGroups",
          "gender",
          "languages",
          "areasOfPractice",
          "assessments",
        ]),
        visible: z.boolean(),
      }),
    )
    .min(1)
    .max(20)
    .optional(),
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
    notifyBody: settings.notifyBody || DEFAULT_NOTIFY_BODY,
    psychiatristDefaultView: isPsychiatristViewMode(settings.psychiatristDefaultView)
      ? settings.psychiatristDefaultView
      : "table",
    psychiatristShowViewOptions: settings.psychiatristShowViewOptions,
    psychiatristBoardFilters: normalizePsychiatristBoardFilters(settings.psychiatristBoardFilters),
    psychiatristProfileFields: normalizePsychiatristProfileFields(settings.psychiatristProfileFields),
    therapistProfileFields: normalizeTherapistProfileFields(settings.therapistProfileFields),
    ...parseTherapistOptionLists(settings),
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
  if (!session?.user || (session.user.role !== Role.ADMIN && session.user.role !== Role.THERAPIST && session.user.role !== Role.PSYCHIATRIST)) {
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

  const {
    alerts,
    notifyBody,
    psychiatristDefaultView,
    psychiatristShowViewOptions,
    psychiatristBoardFilters,
    hpcsaCategories,
    psychiatristProfileFields,
    therapistProfileFields,
    hospitalSettings,
    ageGroupOptions,
    genderOptions,
    languageOptions,
    practiceAreaOptions,
    assessmentTypeOptions,
  } = parsed.data;

  await prisma.appSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      notifyEnabled: true,
      notifyBody: notifyBody?.trim() || DEFAULT_NOTIFY_BODY,
      psychiatristDefaultView: psychiatristDefaultView ?? "table",
      psychiatristShowViewOptions: psychiatristShowViewOptions ?? false,
      psychiatristBoardFilters: psychiatristBoardFilters
        ? normalizePsychiatristBoardFilters(psychiatristBoardFilters)
        : undefined,
      hpcsaCategories: hpcsaCategories ? parseHpcsaCategories(hpcsaCategories) : undefined,
      psychiatristProfileFields: psychiatristProfileFields
        ? normalizePsychiatristProfileFields(psychiatristProfileFields)
        : undefined,
      therapistProfileFields: therapistProfileFields
        ? normalizeTherapistProfileFields(therapistProfileFields)
        : undefined,
      hospitalSettings: hospitalSettings ? parseOptionList(hospitalSettings, DEFAULT_HOSPITAL_SETTINGS) : undefined,
      ageGroupOptions: ageGroupOptions ? parseOptionList(ageGroupOptions, DEFAULT_AGE_GROUPS) : undefined,
      genderOptions: genderOptions ? parseOptionList(genderOptions, DEFAULT_GENDERS) : undefined,
      languageOptions: languageOptions ? parseOptionList(languageOptions, DEFAULT_LANGUAGES) : undefined,
      practiceAreaOptions: practiceAreaOptions
        ? parseOptionList(practiceAreaOptions, DEFAULT_PRACTICE_AREAS)
        : undefined,
      assessmentTypeOptions: assessmentTypeOptions
        ? parseOptionList(assessmentTypeOptions, DEFAULT_ASSESSMENT_TYPES)
        : undefined,
    },
    update: {
      notifyEnabled: true,
      ...(notifyBody !== undefined ? { notifyBody: notifyBody.trim() || DEFAULT_NOTIFY_BODY } : {}),
      ...(psychiatristDefaultView !== undefined ? { psychiatristDefaultView } : {}),
      ...(psychiatristShowViewOptions !== undefined ? { psychiatristShowViewOptions } : {}),
      ...(psychiatristBoardFilters !== undefined
        ? { psychiatristBoardFilters: normalizePsychiatristBoardFilters(psychiatristBoardFilters) }
        : {}),
      ...(hpcsaCategories !== undefined ? { hpcsaCategories: parseHpcsaCategories(hpcsaCategories) } : {}),
      ...(psychiatristProfileFields !== undefined
        ? { psychiatristProfileFields: normalizePsychiatristProfileFields(psychiatristProfileFields) }
        : {}),
      ...(therapistProfileFields !== undefined
        ? { therapistProfileFields: normalizeTherapistProfileFields(therapistProfileFields) }
        : {}),
      ...(hospitalSettings !== undefined
        ? { hospitalSettings: parseOptionList(hospitalSettings, DEFAULT_HOSPITAL_SETTINGS) }
        : {}),
      ...(ageGroupOptions !== undefined
        ? { ageGroupOptions: parseOptionList(ageGroupOptions, DEFAULT_AGE_GROUPS) }
        : {}),
      ...(genderOptions !== undefined ? { genderOptions: parseOptionList(genderOptions, DEFAULT_GENDERS) } : {}),
      ...(languageOptions !== undefined
        ? { languageOptions: parseOptionList(languageOptions, DEFAULT_LANGUAGES) }
        : {}),
      ...(practiceAreaOptions !== undefined
        ? { practiceAreaOptions: parseOptionList(practiceAreaOptions, DEFAULT_PRACTICE_AREAS) }
        : {}),
      ...(assessmentTypeOptions !== undefined
        ? { assessmentTypeOptions: parseOptionList(assessmentTypeOptions, DEFAULT_ASSESSMENT_TYPES) }
        : {}),
    },
  });

  if (alerts !== undefined) {
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
  }

  const settings = await buildSettingsPayload();
  return NextResponse.json({ settings });
}
