import { PrismaClient, CapacityStatus, Role, NotifyFrequency } from "@prisma/client";
import bcrypt from "bcryptjs";
import { formatInTimeZone } from "date-fns-tz";

const prisma = new PrismaClient();

const DEFAULT_TZ = "Africa/Johannesburg";

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

const fictionalTherapists = [
  {
    name: "Dr. Frasier Crane",
    email: "frasier.crane@referralhub.test",
    specialty: "Psychiatry & Talk Radio",
    bio: "Harvard-trained psychiatrist with a passion for fine wine and finer insight.",
    phone: "+1-206-555-0101",
    status: CapacityStatus.AVAILABLE,
    slots: 4,
  },
  {
    name: "Dr. Sean Maguire",
    email: "sean.maguire@referralhub.test",
    specialty: "Psychology & Trauma",
    bio: "Boston psychologist who believes healing starts with honest conversation.",
    phone: "+1-617-555-0102",
    status: CapacityStatus.SOME_CAPACITY,
    slots: 1,
  },
  {
    name: "Dr. Jennifer Melfi",
    email: "jennifer.melfi@referralhub.test",
    specialty: "Psychoanalysis",
    bio: "Thoughtful analyst specializing in complex personality dynamics.",
    phone: "+1-973-555-0103",
    status: CapacityStatus.AVAILABLE,
    slots: 3,
  },
  {
    name: "Dr. Hannibal Lecter",
    email: "hannibal.lecter@referralhub.test",
    specialty: "Forensic Psychiatry",
    bio: "Renowned for precise observation. Prefers quiet mornings.",
    phone: "+1-301-555-0104",
    status: CapacityStatus.NO_CAPACITY,
    slots: null,
  },
  {
    name: "Dr. Spencer Reid",
    email: "spencer.reid@referralhub.test",
    specialty: "Behavioral Analysis",
    bio: "Encyclopedic mind focused on patterns of human behavior.",
    phone: "+1-202-555-0105",
    status: CapacityStatus.SOME_CAPACITY,
    slots: 2,
  },
  {
    name: "Dr. Tobias Fünke",
    email: "tobias.funke@referralhub.test",
    specialty: "Analrapy (Family Systems)",
    bio: "Never-nude practitioner of unconventional family therapy.",
    phone: "+1-949-555-0106",
    status: null,
    slots: null,
  },
  {
    name: "Dr. Niles Crane",
    email: "niles.crane@referralhub.test",
    specialty: "Psychiatry",
    bio: "Refined clinician with exacting standards and excellent taste.",
    phone: "+1-206-555-0107",
    status: CapacityStatus.AVAILABLE,
    slots: 5,
  },
  {
    name: "Dr. Shaun Murphy",
    email: "shaun.murphy@referralhub.test",
    specialty: "Clinical Counseling",
    bio: "Detail-oriented counselor who notices what others miss.",
    phone: "+1-415-555-0108",
    status: CapacityStatus.SOME_CAPACITY,
    slots: 2,
  },
  {
    name: "Dr. Lilith Sternin",
    email: "lilith.sternin@referralhub.test",
    specialty: "Clinical Psychology",
    bio: "Research-driven clinician with a direct communication style.",
    phone: "+1-617-555-0109",
    status: CapacityStatus.NO_CAPACITY,
    slots: null,
  },
  {
    name: "Dr. Paul Weston",
    email: "paul.weston@referralhub.test",
    specialty: "Psychotherapy",
    bio: "Empathetic therapist specializing in long-term relational work.",
    phone: "+1-212-555-0110",
    status: CapacityStatus.AVAILABLE,
    slots: 2,
  },
];

async function main() {
  await prisma.reminderLog.deleteMany();
  await prisma.dailyAvailability.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.therapistProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.appSettings.deleteMany();

  await prisma.appSettings.create({
    data: {
      id: "default",
      notifyEnabled: true,
      notifyTimeLocal: "08:00",
      frequency: NotifyFrequency.DAILY,
    },
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
          specialty: "General Counseling",
          bio: "Practical therapist who keeps sessions grounded and useful.",
          phone: "+1-212-555-0199",
        },
      },
    },
  });

  const todayStr = formatInTimeZone(new Date(), DEFAULT_TZ, "yyyy-MM-dd");
  const today = new Date(`${todayStr}T00:00:00.000Z`);

  await prisma.dailyAvailability.create({
    data: {
      therapistId: mainTherapist.id,
      date: today,
      status: CapacityStatus.AVAILABLE,
      slots: 3,
    },
  });

  for (const t of fictionalTherapists) {
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
            bio: t.bio,
            phone: t.phone,
          },
        },
      },
    });

    if (t.status) {
      await prisma.dailyAvailability.create({
        data: {
          therapistId: user.id,
          date: today,
          status: t.status,
          slots: t.slots,
        },
      });
    }
  }

  console.log("Seed complete.");
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
