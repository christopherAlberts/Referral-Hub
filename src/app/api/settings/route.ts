import { NextResponse } from "next/server";
import { NotifyFrequency, Role } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  notifyEnabled: z.boolean(),
  notifyTimeLocal: z.string().regex(/^\d{2}:\d{2}$/),
  frequency: z.nativeEnum(NotifyFrequency),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== Role.ADMIN && session.user.role !== Role.THERAPIST)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings =
    (await prisma.appSettings.findUnique({ where: { id: "default" } })) ??
    (await prisma.appSettings.create({
      data: { id: "default" },
    }));

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

  const settings = await prisma.appSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ settings });
}
