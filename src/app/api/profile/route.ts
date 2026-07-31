import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2).optional(),
  timezone: z.string().min(1).optional(),
  avatarUrl: z.string().nullable().optional(),
  specialty: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { therapistProfile: true, pushSubscriptions: { select: { id: true } } },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    timezone: user.timezone,
    avatarUrl: user.avatarUrl,
    specialty: user.therapistProfile?.specialty ?? null,
    bio: user.therapistProfile?.bio ?? null,
    phone: user.therapistProfile?.phone ?? null,
    pushEnabled: user.pushSubscriptions.length > 0,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { specialty, bio, phone, ...rest } = parsed.data;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...rest,
      ...(session.user.role === Role.THERAPIST &&
      (specialty !== undefined || bio !== undefined || phone !== undefined)
        ? {
            therapistProfile: {
              upsert: {
                create: {
                  specialty: specialty ?? undefined,
                  bio: bio ?? undefined,
                  phone: phone ?? undefined,
                },
                update: {
                  specialty: specialty ?? undefined,
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

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      timezone: user.timezone,
      avatarUrl: user.avatarUrl,
      specialty: user.therapistProfile?.specialty ?? null,
      bio: user.therapistProfile?.bio ?? null,
      phone: user.therapistProfile?.phone ?? null,
    },
  });
}
