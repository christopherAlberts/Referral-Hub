import { PrismaClient, CapacityStatus, Role, NotifyFrequency } from "@prisma/client";
import bcrypt from "bcryptjs";
import { formatInTimeZone } from "date-fns-tz";

const prisma = new PrismaClient();

const DEFAULT_TZ = "Africa/Johannesburg";
/** Seed capacity for today through this many months ahead (demo-ready board every day). */
const DEMO_MONTHS_AHEAD = 3;

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

const famousTherapists = [
  {
    name: "Sigmund Freud",
    email: "sigmund.freud@referralhub.test",
    specialty: "Clinical Psychologist",
    hospital: "Akeso - George",
    bio: "Founder of psychoanalysis; explores the unconscious through free association and dream work.",
    phone: "+43-1-555-0201",
    status: CapacityStatus.SOME_CAPACITY,
    slots: 1,
  },
  {
    name: "Carl Jung",
    email: "carl.jung@referralhub.test",
    specialty: "Counselling Psychologist",
    hospital: "Neuro Clinic - George",
    bio: "Depth psychologist focused on archetypes, individuation, and the collective unconscious.",
    phone: "+41-61-555-0202",
    status: CapacityStatus.AVAILABLE,
    slots: 3,
  },
  {
    name: "Carl Rogers",
    email: "carl.rogers@referralhub.test",
    specialty: "Counselling Psychologist",
    hospital: "Akeso - George",
    bio: "Humanistic clinician emphasizing empathy, congruence, and unconditional positive regard.",
    phone: "+1-312-555-0203",
    status: CapacityStatus.AVAILABLE,
    slots: 4,
  },
  {
    name: "Virginia Satir",
    email: "virginia.satir@referralhub.test",
    specialty: "Educational Psychologist",
    hospital: "Akeso - George",
    bio: "Pioneer of family therapy known for transforming communication patterns in families.",
    phone: "+1-415-555-0204",
    status: CapacityStatus.SOME_CAPACITY,
    slots: 2,
  },
  {
    name: "Irvin Yalom",
    email: "irvin.yalom@referralhub.test",
    specialty: "Clinical Psychologist",
    hospital: "Neuro Clinic - George",
    bio: "Group and existential therapist exploring meaning, mortality, and authentic connection.",
    phone: "+1-650-555-0205",
    status: CapacityStatus.AVAILABLE,
    slots: 2,
  },
  {
    name: "Aaron Beck",
    email: "aaron.beck@referralhub.test",
    specialty: "Clinical Psychologist",
    hospital: "Akeso - George",
    bio: "Developer of CBT; helps clients identify and reframe unhelpful thought patterns.",
    phone: "+1-215-555-0206",
    status: CapacityStatus.SOME_CAPACITY,
    slots: 1,
  },
  {
    name: "Viktor Frankl",
    email: "viktor.frankl@referralhub.test",
    specialty: "Counselling Psychologist",
    hospital: "Akeso - George",
    bio: "Existential therapist focused on finding meaning even in difficult circumstances.",
    phone: "+43-1-555-0207",
    status: CapacityStatus.AVAILABLE,
    slots: 3,
  },
  {
    name: "Fritz Perls",
    email: "fritz.perls@referralhub.test",
    specialty: "Clinical Psychologist",
    hospital: "Neuro Clinic - George",
    bio: "Gestalt practitioner emphasizing awareness, present-moment experience, and ownership.",
    phone: "+1-212-555-0208",
    status: CapacityStatus.NO_CAPACITY,
    slots: null,
  },
];

const fictionalTherapists = [
  {
    name: "Dr. Frasier Crane",
    email: "frasier.crane@referralhub.test",
    specialty: "Clinical Psychologist",
    hospital: "Akeso - George",
    bio: "Harvard-trained psychiatrist with a passion for fine wine and finer insight.",
    phone: "+1-206-555-0101",
    status: CapacityStatus.AVAILABLE,
    slots: 4,
  },
  {
    name: "Dr. Sean Maguire",
    email: "sean.maguire@referralhub.test",
    specialty: "Counselling Psychologist",
    hospital: "Neuro Clinic - George",
    bio: "Boston psychologist who believes healing starts with honest conversation.",
    phone: "+1-617-555-0102",
    status: CapacityStatus.SOME_CAPACITY,
    slots: 1,
  },
  {
    name: "Dr. Jennifer Melfi",
    email: "jennifer.melfi@referralhub.test",
    specialty: "Clinical Psychologist",
    hospital: "Akeso - George",
    bio: "Thoughtful analyst specializing in complex personality dynamics.",
    phone: "+1-973-555-0103",
    status: CapacityStatus.AVAILABLE,
    slots: 3,
  },
  {
    name: "Dr. Hannibal Lecter",
    email: "hannibal.lecter@referralhub.test",
    specialty: "Clinical Psychologist",
    hospital: "Akeso - George",
    bio: "Renowned for precise observation. Prefers quiet mornings.",
    phone: "+1-301-555-0104",
    status: CapacityStatus.NO_CAPACITY,
    slots: null,
  },
  {
    name: "Dr. Spencer Reid",
    email: "spencer.reid@referralhub.test",
    specialty: "Neuropsychologist",
    hospital: "Neuro Clinic - George",
    bio: "Encyclopedic mind focused on patterns of human behavior.",
    phone: "+1-202-555-0105",
    status: CapacityStatus.SOME_CAPACITY,
    slots: 2,
  },
  {
    name: "Dr. Tobias Fünke",
    email: "tobias.funke@referralhub.test",
    specialty: "Counselling Psychologist",
    hospital: "Akeso - George",
    bio: "Never-nude practitioner of unconventional family therapy.",
    phone: "+1-949-555-0106",
    status: null,
    slots: null,
  },
  {
    name: "Dr. Niles Crane",
    email: "niles.crane@referralhub.test",
    specialty: "Clinical Psychologist",
    hospital: "Akeso - George",
    bio: "Refined clinician with exacting standards and excellent taste.",
    phone: "+1-206-555-0107",
    status: CapacityStatus.AVAILABLE,
    slots: 5,
  },
  {
    name: "Dr. Shaun Murphy",
    email: "shaun.murphy@referralhub.test",
    specialty: "Educational Psychologist",
    hospital: "Neuro Clinic - George",
    bio: "Detail-oriented counselor who notices what others miss.",
    phone: "+1-415-555-0108",
    status: CapacityStatus.SOME_CAPACITY,
    slots: 2,
  },
  {
    name: "Dr. Lilith Sternin",
    email: "lilith.sternin@referralhub.test",
    specialty: "Clinical Psychologist",
    hospital: "Akeso - George",
    bio: "Research-driven clinician with a direct communication style.",
    phone: "+1-617-555-0109",
    status: CapacityStatus.NO_CAPACITY,
    slots: null,
  },
  {
    name: "Dr. Paul Weston",
    email: "paul.weston@referralhub.test",
    specialty: "Counselling Psychologist",
    hospital: "Akeso - George",
    bio: "Empathetic therapist specializing in long-term relational work.",
    phone: "+1-212-555-0110",
    status: CapacityStatus.AVAILABLE,
    slots: 2,
  },
];

const seedTherapists = [...famousTherapists, ...fictionalTherapists];

const AGE_GROUPS = [
  "Children: 6–11 years",
  "Adolescents: 12–17 years",
  "Young adults: 18–25 years",
  "Adults: 26–64 years",
  "Older adults: 65 years and older",
];
const GENDERS = ["Female", "Male", "Other"];
const PRACTICE_AREAS = [
  "Anxiety and OCD",
  "Depression and mood difficulties",
  "Trauma, grief and adjustment",
  "ADHD, autism and neurodiversity",
  "Learning, school and behavioural difficulties",
  "Emotional regulation and personality difficulties",
  "Psychosis and complex mental health",
  "Substance use and addiction",
  "Eating, body-image and health-related difficulties",
  "Relationships, couples and families",
  "Sexuality, gender identity and affirmative support",
  "Work stress and burnout",
  "Cognitive and neuropsychological difficulties",
];
const ASSESSMENT_TYPES = [
  "Clinical and diagnostic assessment",
  "ADHD assessment",
  "Autism and developmental assessment",
  "Cognitive and intellectual assessment",
  "Psychoeducational and learning assessment",
  "Neuropsychological assessment",
];

function demoProfileFields(index: number) {
  const offersAssessments = index % 3 !== 1;
  return {
    gender: GENDERS[index % GENDERS.length],
    ageGroups:
      index % 4 === 0
        ? ["All age groups"]
        : [AGE_GROUPS[index % AGE_GROUPS.length], AGE_GROUPS[(index + 2) % AGE_GROUPS.length]],
    languages: index % 2 === 0 ? ["English"] : ["Afrikaans", "English"],
    areasOfPractice: [
      PRACTICE_AREAS[index % PRACTICE_AREAS.length],
      PRACTICE_AREAS[(index + 3) % PRACTICE_AREAS.length],
      PRACTICE_AREAS[(index + 7) % PRACTICE_AREAS.length],
    ],
    offersAssessments,
    assessmentTypes: offersAssessments
      ? [ASSESSMENT_TYPES[index % ASSESSMENT_TYPES.length], ASSESSMENT_TYPES[(index + 1) % ASSESSMENT_TYPES.length]]
      : [],
  };
}

const STATUS_CYCLE = [
  CapacityStatus.AVAILABLE,
  CapacityStatus.SOME_CAPACITY,
  CapacityStatus.AVAILABLE,
  CapacityStatus.NO_CAPACITY,
  CapacityStatus.AVAILABLE,
  CapacityStatus.SOME_CAPACITY,
] as const;

function demoStatusForDay(
  base: CapacityStatus,
  dayIndex: number,
  therapistIndex: number,
): CapacityStatus {
  // Keep ~1/3 of therapists on their signature status most days; rotate the rest
  // so the psychiatrist board looks different each demo day.
  if ((therapistIndex + dayIndex) % 5 === 0) {
    return STATUS_CYCLE[(dayIndex + therapistIndex) % STATUS_CYCLE.length];
  }
  return base;
}

function demoSlots(status: CapacityStatus, dayIndex: number, therapistIndex: number): number | null {
  if (status === CapacityStatus.NO_CAPACITY) return null;
  if (status === CapacityStatus.SOME_CAPACITY) return ((dayIndex + therapistIndex) % 2) + 1;
  return ((dayIndex + therapistIndex) % 4) + 2;
}

/** Calendar days as UTC-midnight Date values (matches todayInTimezone / Prisma @db.Date). */
function demoDays(fromYmd: string): Date[] {
  const [y, m, d] = fromYmd.split("-").map(Number);
  const start = Date.UTC(y, m - 1, d);
  const end = Date.UTC(y, m - 1 + DEMO_MONTHS_AHEAD, d);
  const days: Date[] = [];
  for (let t = start; t <= end; t += 24 * 60 * 60 * 1000) {
    days.push(new Date(t));
  }
  return days;
}

async function main() {
  await prisma.reminderLog.deleteMany();
  await prisma.notificationAlert.deleteMany();
  await prisma.dailyAvailability.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.therapistProfile.deleteMany();
  await prisma.psychiatristProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.appSettings.deleteMany();

  await prisma.appSettings.create({
    data: {
      id: "default",
      notifyEnabled: true,
      notifyBody: "Hi {{name}} — please update today’s patient capacity.",
      psychiatristDefaultView: "table",
      psychiatristShowViewOptions: false,
      hpcsaCategories: [
        "Clinical Psychologist",
        "Counselling Psychologist",
        "Educational Psychologist",
        "Neuropsychologist",
      ],
      hospitalSettings: ["Neuro Clinic - George", "Akeso - George"],
    },
  });

  await prisma.notificationAlert.createMany({
    data: [
      {
        label: "Morning check-in",
        timeLocal: "08:00",
        frequency: NotifyFrequency.DAILY,
        enabled: true,
        sortOrder: 0,
      },
      {
        label: "Midday reminder",
        timeLocal: "12:00",
        frequency: NotifyFrequency.WEEKDAYS,
        enabled: true,
        sortOrder: 1,
      },
    ],
  });

  await prisma.user.create({
    data: {
      email: "admin@referralhub.test",
      name: "Admin User",
      role: Role.ADMIN,
      timezone: DEFAULT_TZ,
      passwordHash: await hash("Admin123!"),
    },
  });

  await prisma.user.create({
    data: {
      email: "psych@referralhub.test",
      name: "Dr. Gregory House",
      role: Role.PSYCHIATRIST,
      timezone: DEFAULT_TZ,
      passwordHash: await hash("Psych123!"),
      avatarUrl: null,
      psychiatristProfile: {
        create: {
          title: "Consultant Psychiatrist",
          specialty: "Diagnostic medicine & complex cases",
          phone: "+1-609-555-0142",
          secondaryPhone: "+1-609-555-0190",
          clinic: "Princeton-Plainsboro Teaching Hospital",
          licenseNumber: "MD-PPTH-1001",
          bio: "Specializes in differential diagnosis and coordinating specialist referrals.",
        },
      },
    },
  });

  const mainTherapist = await prisma.user.create({
    data: {
      email: "therapist@referralhub.test",
      name: "Dr. Elaine Benes",
      role: Role.THERAPIST,
      timezone: DEFAULT_TZ,
      passwordHash: await hash("Therapy123!"),
      therapistProfile: {
        create: {
          specialty: "Counselling Psychologist",
          hospital: "Neuro Clinic - George",
          bio: "Practical therapist who keeps sessions grounded and useful.",
          phone: "+1-212-555-0199",
          ...demoProfileFields(0),
        },
      },
    },
  });

  const todayStr = formatInTimeZone(new Date(), DEFAULT_TZ, "yyyy-MM-dd");
  const days = demoDays(todayStr);

  const availabilityRows: {
    therapistId: string;
    date: Date;
    status: CapacityStatus;
    slots: number | null;
  }[] = [];

  for (const [dayIndex, day] of days.entries()) {
    const status = demoStatusForDay(CapacityStatus.AVAILABLE, dayIndex, 0);
    availabilityRows.push({
      therapistId: mainTherapist.id,
      date: day,
      status,
      slots: demoSlots(status, dayIndex, 0),
    });
  }

  for (const [therapistIndex, t] of seedTherapists.entries()) {
    const user = await prisma.user.create({
      data: {
        email: t.email,
        name: t.name,
        role: Role.THERAPIST,
        timezone: DEFAULT_TZ,
        passwordHash: await hash("Therapy123!"),
        therapistProfile: {
          create: {
            specialty: t.specialty,
            hospital: t.hospital,
            bio: t.bio,
            phone: t.phone,
            ...demoProfileFields(therapistIndex + 1),
          },
        },
      },
    });

    if (!t.status) continue;

    for (const [dayIndex, day] of days.entries()) {
      const status = demoStatusForDay(t.status, dayIndex, therapistIndex + 1);
      availabilityRows.push({
        therapistId: user.id,
        date: day,
        status,
        slots: demoSlots(status, dayIndex, therapistIndex + 1),
      });
    }
  }

  // Batch inserts stay under typical Postgres parameter limits
  const BATCH = 500;
  for (let i = 0; i < availabilityRows.length; i += BATCH) {
    await prisma.dailyAvailability.createMany({
      data: availabilityRows.slice(i, i + BATCH),
    });
  }

  const endStr = days[days.length - 1]?.toISOString().slice(0, 10) ?? todayStr;
  console.log("Seed complete.");
  console.log(
    `Capacity seeded for ${days.length} days (${todayStr} → ${endStr}) across ${1 + seedTherapists.filter((t) => t.status).length} therapists.`,
  );
  console.log("Admin:        admin@referralhub.test / Admin123!");
  console.log("Psychiatrist: psych@referralhub.test / Psych123!");
  console.log("Therapist:    therapist@referralhub.test / Therapy123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
