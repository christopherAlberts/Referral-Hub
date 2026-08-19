import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HOSPITALS = ["Neuro Clinic - George", "Akeso - George"] as const;
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

const BY_EMAIL: Record<string, { specialty: string; hospital: string }> = {
  "therapist@referralhub.test": {
    specialty: "Counselling Psychologist",
    hospital: "Neuro Clinic - George",
  },
  "sigmund.freud@referralhub.test": {
    specialty: "Clinical Psychologist",
    hospital: "Akeso - George",
  },
  "carl.jung@referralhub.test": {
    specialty: "Counselling Psychologist",
    hospital: "Neuro Clinic - George",
  },
  "carl.rogers@referralhub.test": {
    specialty: "Counselling Psychologist",
    hospital: "Akeso - George",
  },
  "virginia.satir@referralhub.test": {
    specialty: "Educational Psychologist",
    hospital: "Akeso - George",
  },
  "irvin.yalom@referralhub.test": {
    specialty: "Clinical Psychologist",
    hospital: "Neuro Clinic - George",
  },
  "aaron.beck@referralhub.test": {
    specialty: "Clinical Psychologist",
    hospital: "Akeso - George",
  },
  "viktor.frankl@referralhub.test": {
    specialty: "Counselling Psychologist",
    hospital: "Akeso - George",
  },
  "fritz.perls@referralhub.test": {
    specialty: "Clinical Psychologist",
    hospital: "Neuro Clinic - George",
  },
  "frasier.crane@referralhub.test": {
    specialty: "Clinical Psychologist",
    hospital: "Akeso - George",
  },
  "sean.maguire@referralhub.test": {
    specialty: "Counselling Psychologist",
    hospital: "Neuro Clinic - George",
  },
  "jennifer.melfi@referralhub.test": {
    specialty: "Clinical Psychologist",
    hospital: "Akeso - George",
  },
  "hannibal.lecter@referralhub.test": {
    specialty: "Clinical Psychologist",
    hospital: "Akeso - George",
  },
  "spencer.reid@referralhub.test": {
    specialty: "Neuropsychologist",
    hospital: "Neuro Clinic - George",
  },
  "tobias.funke@referralhub.test": {
    specialty: "Counselling Psychologist",
    hospital: "Akeso - George",
  },
  "niles.crane@referralhub.test": {
    specialty: "Clinical Psychologist",
    hospital: "Akeso - George",
  },
  "shaun.murphy@referralhub.test": {
    specialty: "Educational Psychologist",
    hospital: "Neuro Clinic - George",
  },
  "lilith.sternin@referralhub.test": {
    specialty: "Clinical Psychologist",
    hospital: "Akeso - George",
  },
  "paul.weston@referralhub.test": {
    specialty: "Counselling Psychologist",
    hospital: "Akeso - George",
  },
};

function mapHospital(value: string | null | undefined, index: number): string {
  if (value === "AKESO" || value === "Akeso") return "Akeso - George";
  if (value === "NEURO_CLINIC" || value === "Neuro Clinic") return "Neuro Clinic - George";
  if (value === "OTHER") return HOSPITALS[index % HOSPITALS.length];
  if (value === "Akeso - George" || value === "Neuro Clinic - George") return value;
  return HOSPITALS[index % HOSPITALS.length];
}

async function main() {
  const therapists = await prisma.user.findMany({
    where: { role: "THERAPIST" },
    include: { therapistProfile: true },
    orderBy: { name: "asc" },
  });

  let updated = 0;
  for (const [index, user] of therapists.entries()) {
    const mapped = BY_EMAIL[user.email];
    const hospital = mapped?.hospital ?? mapHospital(user.therapistProfile?.hospital, index);
    const allowed = new Set([
      "Clinical Psychologist",
      "Counselling Psychologist",
      "Educational Psychologist",
      "Neuropsychologist",
    ]);
    const current = mapped?.specialty ?? user.therapistProfile?.specialty ?? "Clinical Psychologist";
    const specialty = allowed.has(current) ? current : "Clinical Psychologist";
    const offersAssessments = index % 3 !== 1;
    const extras = {
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
        ? [
            ASSESSMENT_TYPES[index % ASSESSMENT_TYPES.length],
            ASSESSMENT_TYPES[(index + 1) % ASSESSMENT_TYPES.length],
          ]
        : [],
    };

    if (user.therapistProfile) {
      await prisma.therapistProfile.update({
        where: { id: user.therapistProfile.id },
        data: { hospital, specialty, ...extras },
      });
    } else {
      await prisma.therapistProfile.create({
        data: { userId: user.id, hospital, specialty, ...extras },
      });
    }
    updated += 1;
  }

  console.log(`Backfilled therapist profile fields for ${updated} therapists.`);

  await prisma.appSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      hpcsaCategories: [
        "Clinical Psychologist",
        "Counselling Psychologist",
        "Educational Psychologist",
        "Neuropsychologist",
      ],
      hospitalSettings: ["Neuro Clinic - George", "Akeso - George"],
    },
    update: {
      hpcsaCategories: [
        "Clinical Psychologist",
        "Counselling Psychologist",
        "Educational Psychologist",
        "Neuropsychologist",
      ],
      hospitalSettings: ["Neuro Clinic - George", "Akeso - George"],
    },
  });
  console.log("Updated therapist option lists in settings.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
