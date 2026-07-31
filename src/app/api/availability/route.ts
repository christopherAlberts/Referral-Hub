import { NextResponse } from "next/server";
import { CapacityStatus, Role } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateStringInTimezone, todayInTimezone } from "@/lib/timezone";

const schema = z.object({
  status: z.nativeEnum(CapacityStatus),
  slots: z.number().int().min(1).max(50).nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role === Role.THERAPIST) {
    const date = todayInTimezone(session.user.timezone);
    const availability = await prisma.dailyAvailability.findUnique({
      where: {
        therapistId_date: { therapistId: session.user.id, date },
      },
    });
    return NextResponse.json({ availability, date: dateStringInTimezone(session.user.timezone) });
  }

  if (session.user.role === Role.PSYCHIATRIST || session.user.role === Role.ADMIN) {
    const therapists = await prisma.user.findMany({
      where: { role: Role.THERAPIST, active: true },
      include: { therapistProfile: true },
      orderBy: { name: "asc" },
    });

    const rows = await Promise.all(
      therapists.map(async (t) => {
        const date = todayInTimezone(t.timezone);
        const availability = await prisma.dailyAvailability.findUnique({
          where: { therapistId_date: { therapistId: t.id, date } },
        });

        return {
          id: t.id,
          name: t.name,
          email: t.email,
          avatarUrl: t.avatarUrl,
          timezone: t.timezone,
          specialty: t.therapistProfile?.specialty ?? null,
          bio: t.therapistProfile?.bio ?? null,
          phone: t.therapistProfile?.phone ?? null,
          availability: availability
            ? {
                status: availability.status,
                slots: availability.slots,
                updatedAt: availability.updatedAt,
              }
            : null,
        };
      }),
    );

    return NextResponse.json({ therapists: rows });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.THERAPIST) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { status, slots } = parsed.data;
  if (status !== CapacityStatus.NO_CAPACITY && (!slots || slots < 1)) {
    return NextResponse.json({ error: "Slots required for this status" }, { status: 400 });
  }

  const date = todayInTimezone(session.user.timezone);
  const availability = await prisma.dailyAvailability.upsert({
    where: { therapistId_date: { therapistId: session.user.id, date } },
    create: {
      therapistId: session.user.id,
      date,
      status,
      slots: status === CapacityStatus.NO_CAPACITY ? null : slots!,
    },
    update: {
      status,
      slots: status === CapacityStatus.NO_CAPACITY ? null : slots!,
    },
  });

  return NextResponse.json({ availability });
}
