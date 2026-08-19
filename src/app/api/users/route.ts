import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayInTimezone } from "@/lib/timezone";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.nativeEnum(Role),
  timezone: z.string().min(1),
  password: z.string().min(8),
  specialty: z.string().optional(),
  hospital: z.string().optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  timezone: z.string().min(1).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
  specialty: z.string().nullable().optional(),
  hospital: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    include: {
      therapistProfile: true,
      pushSubscriptions: { select: { id: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const todayByTz = new Map<string, Date>();
  const rows = await Promise.all(
    users.map(async (u) => {
      let today = todayByTz.get(u.timezone);
      if (!today) {
        today = todayInTimezone(u.timezone);
        todayByTz.set(u.timezone, today);
      }

      const todayAvailability =
        u.role === Role.THERAPIST
          ? await prisma.dailyAvailability.findUnique({
              where: { therapistId_date: { therapistId: u.id, date: today } },
            })
          : null;

      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        timezone: u.timezone,
        active: u.active,
        avatarUrl: u.avatarUrl,
        specialty: u.therapistProfile?.specialty ?? null,
        hospital: u.therapistProfile?.hospital ?? null,
        bio: u.therapistProfile?.bio ?? null,
        phone: u.therapistProfile?.phone ?? null,
        pushEnabled: u.pushSubscriptions.length > 0,
        lastAvailability: todayAvailability
          ? {
              date: todayAvailability.date,
              status: todayAvailability.status,
              slots: todayAvailability.slots,
              updatedAt: todayAvailability.updatedAt,
            }
          : null,
        todayDate: today,
      };
    }),
  );

  return NextResponse.json({ users: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      name: data.name,
      role: data.role,
      timezone: data.timezone,
      passwordHash: await bcrypt.hash(data.password, 10),
      ...(data.role === Role.THERAPIST
        ? {
            therapistProfile: {
              create: {
                specialty: data.specialty,
                hospital: data.hospital,
                bio: data.bio,
                phone: data.phone,
              },
            },
          }
        : {}),
    },
    include: { therapistProfile: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, password, specialty, hospital, bio, phone, ...rest } = parsed.data;
  const user = await prisma.user.update({
    where: { id },
    data: {
      ...rest,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      ...(specialty !== undefined || hospital !== undefined || bio !== undefined || phone !== undefined
        ? {
            therapistProfile: {
              upsert: {
                create: {
                  specialty: specialty ?? undefined,
                  hospital: hospital ?? undefined,
                  bio: bio ?? undefined,
                  phone: phone ?? undefined,
                },
                update: {
                  specialty: specialty ?? undefined,
                  hospital: hospital ?? undefined,
                  bio: bio ?? undefined,
                  phone: phone ?? undefined,
                },
              },
            },
          }
        : {}),
    },
    include: { therapistProfile: true },
  });

  return NextResponse.json({ user });
}
