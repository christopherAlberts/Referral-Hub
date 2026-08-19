import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  normalizePsychiatristProfileFields,
  normalizeTherapistProfileFields,
  parseTherapistOptionLists,
  psychiatristFieldMap,
  therapistFieldMap,
} from "@/lib/therapist-fields";

const schema = z.object({
  name: z.string().min(2).optional(),
  timezone: z.string().min(1).optional(),
  avatarUrl: z.string().nullable().optional(),
  specialty: z.string().nullable().optional(),
  hospital: z.string().nullable().optional(),
  ageGroups: z.array(z.string()).optional(),
  gender: z.string().nullable().optional(),
  languages: z.array(z.string()).optional(),
  areasOfPractice: z.array(z.string()).optional(),
  offersAssessments: z.boolean().nullable().optional(),
  assessmentTypes: z.array(z.string()).optional(),
  bio: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  secondaryPhone: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  clinic: z.string().nullable().optional(),
  licenseNumber: z.string().nullable().optional(),
});

function therapistPayload(therapist: {
  specialty: string | null;
  hospital: string | null;
  ageGroups: string[];
  gender: string | null;
  languages: string[];
  areasOfPractice: string[];
  offersAssessments: boolean | null;
  assessmentTypes: string[];
  bio: string | null;
  phone: string | null;
} | null) {
  return {
    specialty: therapist?.specialty ?? null,
    hospital: therapist?.hospital ?? null,
    ageGroups: therapist?.ageGroups ?? [],
    gender: therapist?.gender ?? null,
    languages: therapist?.languages ?? [],
    areasOfPractice: therapist?.areasOfPractice ?? [],
    offersAssessments: therapist?.offersAssessments ?? null,
    assessmentTypes: therapist?.assessmentTypes ?? [],
    bio: therapist?.bio ?? null,
    phone: therapist?.phone ?? null,
  };
}

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
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    timezone: user.timezone,
    avatarUrl: user.avatarUrl,
    pushEnabled: user.pushSubscriptions.length > 0,
    ...therapistPayload(therapist),
    specialty: psych?.specialty ?? therapist?.specialty ?? null,
    bio: psych?.bio ?? therapist?.bio ?? null,
    phone: psych?.phone ?? therapist?.phone ?? null,
    secondaryPhone: psych?.secondaryPhone ?? null,
    title: psych?.title ?? null,
    clinic: psych?.clinic ?? null,
    licenseNumber: psych?.licenseNumber ?? null,
    psychiatristProfileFields: normalizePsychiatristProfileFields(settings?.psychiatristProfileFields),
    therapistProfileFields: normalizeTherapistProfileFields(settings?.therapistProfileFields),
    ...parseTherapistOptionLists(settings ?? {}),
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const role = session.user.role;
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });

  if (role === Role.PSYCHIATRIST) {
    const fields = psychiatristFieldMap(
      normalizePsychiatristProfileFields(settings?.psychiatristProfileFields),
    );
    const missing: string[] = [];
    if (fields.name.visible && fields.name.required && !parsed.data.name?.trim()) missing.push(fields.name.label);
    if (fields.whatsapp.visible && fields.whatsapp.required && !parsed.data.phone?.trim()) {
      missing.push(fields.whatsapp.label);
    }
    if (fields.title.visible && fields.title.required && !parsed.data.title?.trim()) missing.push(fields.title.label);
    if (fields.specialty.visible && fields.specialty.required && !parsed.data.specialty?.trim()) {
      missing.push(fields.specialty.label);
    }
    if (fields.clinic.visible && fields.clinic.required && !parsed.data.clinic?.trim()) missing.push(fields.clinic.label);
    if (fields.licenseNumber.visible && fields.licenseNumber.required && !parsed.data.licenseNumber?.trim()) {
      missing.push(fields.licenseNumber.label);
    }
    if (fields.secondaryPhone.visible && fields.secondaryPhone.required && !parsed.data.secondaryPhone?.trim()) {
      missing.push(fields.secondaryPhone.label);
    }
    if (fields.bio.visible && fields.bio.required && !parsed.data.bio?.trim()) missing.push(fields.bio.label);
    if (fields.timezone.visible && fields.timezone.required && !parsed.data.timezone?.trim()) {
      missing.push(fields.timezone.label);
    }
    if (missing.length) {
      return NextResponse.json({ error: `Please complete: ${missing.join(", ")}` }, { status: 400 });
    }
  }

  if (role === Role.THERAPIST) {
    const fields = therapistFieldMap(normalizeTherapistProfileFields(settings?.therapistProfileFields));
    const missing: string[] = [];
    if (fields.name.visible && fields.name.required && !parsed.data.name?.trim()) missing.push(fields.name.label);
    if (fields.phone.visible && fields.phone.required && !parsed.data.phone?.trim()) missing.push(fields.phone.label);
    if (fields.hpcsa.visible && fields.hpcsa.required && !parsed.data.specialty?.trim()) missing.push(fields.hpcsa.label);
    if (fields.hospital.visible && fields.hospital.required && !parsed.data.hospital?.trim()) {
      missing.push(fields.hospital.label);
    }
    if (fields.ageGroups.visible && fields.ageGroups.required && !(parsed.data.ageGroups?.length)) {
      missing.push(fields.ageGroups.label);
    }
    if (fields.gender.visible && fields.gender.required && !parsed.data.gender?.trim()) missing.push(fields.gender.label);
    if (fields.languages.visible && fields.languages.required && !(parsed.data.languages?.length)) {
      missing.push(fields.languages.label);
    }
    if (fields.areasOfPractice.visible && fields.areasOfPractice.required && !(parsed.data.areasOfPractice?.length)) {
      missing.push(fields.areasOfPractice.label);
    }
    if (fields.assessments.visible && fields.assessments.required) {
      if (parsed.data.offersAssessments == null) missing.push(fields.assessments.label);
      else if (parsed.data.offersAssessments && !(parsed.data.assessmentTypes?.length)) {
        missing.push("Types of assessment");
      }
    }
    if (fields.bio.visible && fields.bio.required && !parsed.data.bio?.trim()) missing.push(fields.bio.label);
    if (fields.timezone.visible && fields.timezone.required && !parsed.data.timezone?.trim()) {
      missing.push(fields.timezone.label);
    }
    if (missing.length) {
      return NextResponse.json({ error: `Please complete: ${missing.join(", ")}` }, { status: 400 });
    }
  }

  const {
    specialty,
    hospital,
    ageGroups,
    gender,
    languages,
    areasOfPractice,
    offersAssessments,
    assessmentTypes,
    bio,
    phone,
    secondaryPhone,
    title,
    clinic,
    licenseNumber,
    ...rest
  } = parsed.data;

  const therapistTouched =
    specialty !== undefined ||
    hospital !== undefined ||
    ageGroups !== undefined ||
    gender !== undefined ||
    languages !== undefined ||
    areasOfPractice !== undefined ||
    offersAssessments !== undefined ||
    assessmentTypes !== undefined ||
    bio !== undefined ||
    phone !== undefined;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...rest,
      ...(role === Role.THERAPIST && therapistTouched
        ? {
            therapistProfile: {
              upsert: {
                create: {
                  specialty: specialty ?? undefined,
                  hospital: hospital ?? undefined,
                  ageGroups: ageGroups ?? [],
                  gender: gender ?? undefined,
                  languages: languages ?? [],
                  areasOfPractice: areasOfPractice ?? [],
                  offersAssessments: offersAssessments ?? undefined,
                  assessmentTypes: offersAssessments ? (assessmentTypes ?? []) : [],
                  bio: bio ?? undefined,
                  phone: phone ?? undefined,
                },
                update: {
                  specialty: specialty ?? undefined,
                  hospital: hospital ?? undefined,
                  ageGroups: ageGroups ?? undefined,
                  gender: gender ?? undefined,
                  languages: languages ?? undefined,
                  areasOfPractice: areasOfPractice ?? undefined,
                  offersAssessments: offersAssessments ?? undefined,
                  assessmentTypes:
                    offersAssessments === false ? [] : (assessmentTypes ?? undefined),
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
      ...therapistPayload(therapist),
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
