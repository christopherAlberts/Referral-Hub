export const DEFAULT_HPCSA_CATEGORIES = [
  "Clinical Psychologist",
  "Counselling Psychologist",
  "Educational Psychologist",
  "Neuropsychologist",
] as const;

export const DEFAULT_HOSPITAL_SETTINGS = ["Neuro Clinic - George", "Akeso - George"] as const;

export const ALL_AGE_GROUPS = "All age groups";

export const DEFAULT_AGE_GROUPS = [
  "Children: 6–11 years",
  "Adolescents: 12–17 years",
  "Young adults: 18–25 years",
  "Adults: 26–64 years",
  "Older adults: 65 years and older",
  ALL_AGE_GROUPS,
] as const;

export const DEFAULT_GENDERS = ["Female", "Male", "Other"] as const;

export const DEFAULT_LANGUAGES = ["Afrikaans", "English", "Other"] as const;

export const DEFAULT_PRACTICE_AREAS = [
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
] as const;

export const DEFAULT_ASSESSMENT_TYPES = [
  "Clinical and diagnostic assessment",
  "ADHD assessment",
  "Autism and developmental assessment",
  "Cognitive and intellectual assessment",
  "Psychoeducational and learning assessment",
  "Neuropsychological assessment",
  "Personality and emotional functioning assessment",
  "Career and vocational assessment",
  "Medico-legal and forensic assessment",
  "Special-purpose assessment, such as pre-surgical or readiness assessment",
] as const;

export type PsychiatristProfileFieldId =
  | "name"
  | "email"
  | "whatsapp"
  | "avatar"
  | "title"
  | "secondaryPhone"
  | "specialty"
  | "clinic"
  | "licenseNumber"
  | "timezone"
  | "bio";

export type TherapistProfileFieldId =
  | "name"
  | "email"
  | "phone"
  | "avatar"
  | "timezone"
  | "bio"
  | "hpcsa"
  | "hospital"
  | "ageGroups"
  | "gender"
  | "languages"
  | "areasOfPractice"
  | "assessments";

export type ProfileFieldSetting<Id extends string = string> = {
  id: Id;
  label: string;
  visible: boolean;
  required: boolean;
};

export type PsychiatristProfileFieldSetting = ProfileFieldSetting<PsychiatristProfileFieldId>;
export type TherapistProfileFieldSetting = ProfileFieldSetting<TherapistProfileFieldId>;

export const PSYCHIATRIST_PROFILE_FIELD_DEFS: { id: PsychiatristProfileFieldId; label: string }[] = [
  { id: "name", label: "Full Name" },
  { id: "email", label: "Email" },
  { id: "whatsapp", label: "Preferred number for WhatsApp communication" },
  { id: "avatar", label: "Profile photo" },
  { id: "title", label: "Title" },
  { id: "secondaryPhone", label: "Secondary number" },
  { id: "specialty", label: "Specialty" },
  { id: "clinic", label: "Clinic / practice" },
  { id: "licenseNumber", label: "License / registration number" },
  { id: "timezone", label: "Timezone" },
  { id: "bio", label: "Bio / notes" },
];

export const THERAPIST_PROFILE_FIELD_DEFS: { id: TherapistProfileFieldId; label: string }[] = [
  { id: "hpcsa", label: "HPCSA Registration Category" },
  { id: "hospital", label: "Hospital Setting" },
  { id: "ageGroups", label: "Preferred patient age groups" },
  { id: "gender", label: "Gender" },
  { id: "languages", label: "Language" },
  { id: "areasOfPractice", label: "Areas of practice" },
  { id: "assessments", label: "Assessment" },
  { id: "name", label: "Full Name" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "avatar", label: "Profile photo" },
  { id: "timezone", label: "Timezone" },
  { id: "bio", label: "Bio / notes" },
];

const DEFAULT_PSYCHIATRIST_VISIBLE = new Set<PsychiatristProfileFieldId>(["name", "email", "whatsapp"]);
const DEFAULT_THERAPIST_VISIBLE = new Set<TherapistProfileFieldId>([
  "hpcsa",
  "hospital",
  "ageGroups",
  "gender",
  "languages",
  "areasOfPractice",
  "assessments",
]);

export const PSYCHIATRIST_VIEWS = [
  { id: "table", label: "Table" },
  { id: "three", label: "3 columns" },
  { id: "one", label: "1 column" },
] as const;

export type PsychiatristViewMode = (typeof PSYCHIATRIST_VIEWS)[number]["id"];

export type PsychiatristBoardFilterId =
  | "search"
  | "sort"
  | "status"
  | "hpcsa"
  | "hospital"
  | "ageGroups"
  | "gender"
  | "languages"
  | "areasOfPractice"
  | "assessments";

export type PsychiatristBoardFilterSetting = {
  id: PsychiatristBoardFilterId;
  label: string;
  visible: boolean;
};

export const PSYCHIATRIST_BOARD_FILTER_DEFS: { id: PsychiatristBoardFilterId; label: string }[] = [
  { id: "search", label: "Search" },
  { id: "sort", label: "A → Z sort" },
  { id: "status", label: "Capacity status" },
  { id: "hpcsa", label: "HPCSA Registration Category" },
  { id: "hospital", label: "Hospital Setting" },
  { id: "ageGroups", label: "Preferred patient age groups" },
  { id: "gender", label: "Gender" },
  { id: "languages", label: "Language" },
  { id: "areasOfPractice", label: "Areas of practice" },
  { id: "assessments", label: "Assessment" },
];

export function isPsychiatristViewMode(value: unknown): value is PsychiatristViewMode {
  return PSYCHIATRIST_VIEWS.some((view) => view.id === value);
}

export function hospitalLabel(hospital: string | null | undefined): string | null {
  if (!hospital) return null;
  return mapHospitalValue(hospital);
}

export function mapHospitalValue(hospital: string | null | undefined): string | null {
  if (!hospital) return null;
  if (hospital === "AKESO" || hospital === "Akeso") return "Akeso - George";
  if (hospital === "NEURO_CLINIC" || hospital === "Neuro Clinic") return "Neuro Clinic - George";
  if (hospital === "OTHER") return "Akeso - George";
  return hospital;
}

function asStringArray(value: unknown): string[] | null {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : null;
    } catch {
      return value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return null;
}

export function parseOptionList(value: unknown, fallback: readonly string[]): string[] {
  const list = (asStringArray(value) ?? [...fallback]).map((item) => item.trim()).filter(Boolean);
  const unique: string[] = [];
  for (const item of list) {
    if (!unique.some((existing) => existing.toLowerCase() === item.toLowerCase())) {
      unique.push(item);
    }
  }
  return unique.length > 0 ? unique : [...fallback];
}

export function parseHpcsaCategories(value: unknown): string[] {
  return parseOptionList(value, DEFAULT_HPCSA_CATEGORIES);
}

export function parseHospitalSettings(value: unknown): string[] {
  return parseOptionList(value, DEFAULT_HOSPITAL_SETTINGS);
}

function normalizeProfileFields<Id extends string>(
  defs: { id: Id; label: string }[],
  defaults: Set<Id>,
  value: unknown,
): ProfileFieldSetting<Id>[] {
  const rows = Array.isArray(value) ? value : [];
  const byId = new Map<string, { visible?: unknown; required?: unknown }>();
  for (const row of rows) {
    if (!row || typeof row !== "object" || !("id" in row)) continue;
    byId.set(String((row as { id: unknown }).id), row as { visible?: unknown; required?: unknown });
  }

  return defs.map((def) => {
    const saved = byId.get(def.id);
    const visible = typeof saved?.visible === "boolean" ? saved.visible : defaults.has(def.id);
    const requiredDefault = defaults.has(def.id);
    const required =
      visible && (typeof saved?.required === "boolean" ? saved.required : requiredDefault);
    return { ...def, visible, required };
  });
}

export function normalizePsychiatristProfileFields(value: unknown): PsychiatristProfileFieldSetting[] {
  return normalizeProfileFields(PSYCHIATRIST_PROFILE_FIELD_DEFS, DEFAULT_PSYCHIATRIST_VISIBLE, value);
}

export function normalizeTherapistProfileFields(value: unknown): TherapistProfileFieldSetting[] {
  return normalizeProfileFields(THERAPIST_PROFILE_FIELD_DEFS, DEFAULT_THERAPIST_VISIBLE, value);
}

export function normalizePsychiatristBoardFilters(value: unknown): PsychiatristBoardFilterSetting[] {
  const rows = Array.isArray(value) ? value : [];
  const byId = new Map<string, { visible?: unknown }>();
  for (const row of rows) {
    if (!row || typeof row !== "object" || !("id" in row)) continue;
    byId.set(String((row as { id: unknown }).id), row as { visible?: unknown });
  }

  return PSYCHIATRIST_BOARD_FILTER_DEFS.map((def) => {
    const saved = byId.get(def.id);
    return {
      ...def,
      visible: typeof saved?.visible === "boolean" ? saved.visible : true,
    };
  });
}

export function psychiatristBoardFilterMap(filters: PsychiatristBoardFilterSetting[]) {
  return Object.fromEntries(filters.map((filter) => [filter.id, filter])) as Record<
    PsychiatristBoardFilterId,
    PsychiatristBoardFilterSetting
  >;
}

export function mergeUniqueOptions(
  configured: readonly string[],
  extras: Iterable<string | null | undefined>,
): string[] {
  const unique: string[] = [];
  for (const item of [...configured, ...extras]) {
    const value = item?.trim();
    if (!value) continue;
    if (!unique.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
      unique.push(value);
    }
  }
  return unique;
}

export function matchesAgeGroupFilter(ageGroups: string[] | undefined, selected: string): boolean {
  if (selected === "ALL") return true;
  const values = ageGroups ?? [];
  if (values.includes(ALL_AGE_GROUPS)) return true;
  return values.includes(selected);
}

export function psychiatristFieldMap(fields: PsychiatristProfileFieldSetting[]) {
  return Object.fromEntries(fields.map((field) => [field.id, field])) as Record<
    PsychiatristProfileFieldId,
    PsychiatristProfileFieldSetting
  >;
}

export function therapistFieldMap(fields: TherapistProfileFieldSetting[]) {
  return Object.fromEntries(fields.map((field) => [field.id, field])) as Record<
    TherapistProfileFieldId,
    TherapistProfileFieldSetting
  >;
}

export function toggleExclusiveList(values: string[], option: string, exclusiveValue: string): string[] {
  if (option === exclusiveValue) {
    return values.includes(exclusiveValue) ? [] : [exclusiveValue];
  }
  const withoutExclusive = values.filter((item) => item !== exclusiveValue);
  return withoutExclusive.includes(option)
    ? withoutExclusive.filter((item) => item !== option)
    : [...withoutExclusive, option];
}

export type TherapistOptionLists = {
  hpcsaCategories: string[];
  hospitalSettings: string[];
  ageGroupOptions: string[];
  genderOptions: string[];
  languageOptions: string[];
  practiceAreaOptions: string[];
  assessmentTypeOptions: string[];
};

export function parseTherapistOptionLists(settings: {
  hpcsaCategories?: unknown;
  hospitalSettings?: unknown;
  ageGroupOptions?: unknown;
  genderOptions?: unknown;
  languageOptions?: unknown;
  practiceAreaOptions?: unknown;
  assessmentTypeOptions?: unknown;
}): TherapistOptionLists {
  return {
    hpcsaCategories: parseHpcsaCategories(settings.hpcsaCategories),
    hospitalSettings: parseHospitalSettings(settings.hospitalSettings),
    ageGroupOptions: parseOptionList(settings.ageGroupOptions, DEFAULT_AGE_GROUPS),
    genderOptions: parseOptionList(settings.genderOptions, DEFAULT_GENDERS),
    languageOptions: parseOptionList(settings.languageOptions, DEFAULT_LANGUAGES),
    practiceAreaOptions: parseOptionList(settings.practiceAreaOptions, DEFAULT_PRACTICE_AREAS),
    assessmentTypeOptions: parseOptionList(settings.assessmentTypeOptions, DEFAULT_ASSESSMENT_TYPES),
  };
}
