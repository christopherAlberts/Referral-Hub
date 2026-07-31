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
  secondaryPhone: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  clinic: z.string().nullable().optional(),
  licenseNumber: z.string().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      therapistProfile: true,
      psychiatristProfile: true,
      pushSubscriptions: { select: { id: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const psych = user.psychiatristProfile;
  const therapist = user.therapistProfile;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    timezone: user.timezone,
    avatarUrl: user.avatarUrl,
    pushEnabled: user.pushSubscriptions.length > 0,
    specialty: psych?.specialty ?? therapist?.specialty ?? null,
    bio: psych?.bio ?? therapist?.bio ?? null,
    phone: psych?.phone ?? therapist?.phone ?? null,
    secondaryPhone: psych?.secondaryPhone ?? null,
    title: psych?.title ?? null,
    clinic: psych?.clinic ?? null,
    licenseNumber: psych?.licenseNumber ?? null,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    specialty,
    bio,
    phone,
    secondaryPhone,
    title,
    clinic,
    licenseNumber,
    ...rest
  } = parsed.data;

  const role = session.user.role;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...rest,
      ...(role === Role.THERAPIST &&
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
      ...(role === Role.PSYCHIATRIST &&
      (specialty !== undefined ||
        bio !== undefined ||
        phone !== undefined ||
        secondaryPhone !== undefined ||
        title !== undefined ||
        clinic !== undefined ||
        licenseNumber !== undefined)
        ? {
            psychiatristProfile: {
              upsert: {
                create: {
                  specialty: specialty ?? undefined,
                  bio: bio ?? undefined,
                  phone: phone ?? undefined,
                  secondaryPhone: secondaryPhone ?? undefined,
                  title: title ?? undefined,
                  clinic: clinic ?? undefined,
                  licenseNumber: licenseNumber ?? undefined,
                },
                update: {
                  specialty: specialty ?? undefined,
                  bio: bio ?? undefined,
                  phone: phone ?? undefined,
                  secondaryPhone: secondaryPhone ?? undefined,
                  title: title ?? undefined,
                  clinic: clinic ?? undefined,
                  licenseNumber: licenseNumber ?? undefined,
                },
              },
            },
          }
        : {}),
    },
    include: { therapistProfile: true, psychiatristProfile: true },
  });

  const psych = user.psychiatristProfile;
  const therapist = user.therapistProfile;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
      avatarUrl: user.avatarUrl,
      specialty: psych?.specialty ?? therapist?.specialty ?? null,
      bio: psych?.bio ?? therapist?.bio ?? null,
      phone: psych?.phone ?? therapist?.phone ?? null,
      secondaryPhone: psych?.secondaryPhone ?? null,
      title: psych?.title ?? null,
      clinic: psych?.clinic ?? null,
      licenseNumber: psych?.licenseNumber ?? null,
    },
  });
}
