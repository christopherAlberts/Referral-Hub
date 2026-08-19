"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CapacityStatus } from "@prisma/client";
import { TherapistBubble, type TherapistBoardItem } from "@/components/TherapistBubble";
import {
  hospitalLabel,
  isPsychiatristViewMode,
  matchesAgeGroupFilter,
  mergeUniqueOptions,
  normalizePsychiatristBoardFilters,
  parseTherapistOptionLists,
  psychiatristBoardFilterMap,
  PSYCHIATRIST_VIEWS,
  type PsychiatristBoardFilterSetting,
  type PsychiatristViewMode,
  type TherapistOptionLists,
} from "@/lib/therapist-fields";
import { initials } from "@/lib/utils";

type StatusFilter = "ALL" | CapacityStatus | "NONE";
type SortDir = "asc" | "desc";
type AssessmentOfferFilter = "ALL" | "YES" | "NO";

type BoardSettings = {
  defaultView: PsychiatristViewMode;
  showViewOptions: boolean;
  filters: PsychiatristBoardFilterSetting[];
  optionLists: TherapistOptionLists;
};

const EMPTY_OPTION_LISTS = parseTherapistOptionLists({});
const DEFAULT_FILTERS = normalizePsychiatristBoardFilters(null);

export function PsychiatristBoard() {
  const [therapists, setTherapists] = useState<TherapistBoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortDir>("asc");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [specialty, setSpecialty] = useState("ALL");
  const [hospital, setHospital] = useState("ALL");
  const [ageGroup, setAgeGroup] = useState("ALL");
  const [gender, setGender] = useState("ALL");
  const [language, setLanguage] = useState("ALL");
  const [areaOfPractice, setAreaOfPractice] = useState("ALL");
  const [assessmentOffer, setAssessmentOffer] = useState<AssessmentOfferFilter>("ALL");
  const [assessmentType, setAssessmentType] = useState("ALL");
  const [view, setView] = useState<PsychiatristViewMode>("table");
  const [boardSettings, setBoardSettings] = useState<BoardSettings>({
    defaultView: "table",
    showViewOptions: false,
    filters: DEFAULT_FILTERS,
    optionLists: EMPTY_OPTION_LISTS,
  });
  const viewHydrated = useRef(false);
  const show = psychiatristBoardFilterMap(boardSettings.filters);

  function applyBoardSettings(next: BoardSettings) {
    setBoardSettings(next);
    if (!next.showViewOptions || !viewHydrated.current) {
      setView(next.defaultView);
      viewHydrated.current = true;
    }
  }

  async function load() {
    const res = await fetch("/api/availability", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setTherapists(data.therapists ?? []);
    const defaultView = isPsychiatristViewMode(data.boardSettings?.defaultView)
      ? data.boardSettings.defaultView
      : "table";
    applyBoardSettings({
      defaultView,
      showViewOptions: Boolean(data.boardSettings?.showViewOptions),
      filters: normalizePsychiatristBoardFilters(data.boardSettings?.filters),
      optionLists: parseTherapistOptionLists(data.boardSettings?.optionLists ?? {}),
    });
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const specialties = useMemo(
    () => mergeUniqueOptions(boardSettings.optionLists.hpcsaCategories, therapists.map((t) => t.specialty)),
    [therapists, boardSettings.optionLists.hpcsaCategories],
  );

  const hospitals = useMemo(
    () => mergeUniqueOptions(boardSettings.optionLists.hospitalSettings, therapists.map((t) => t.hospital)),
    [therapists, boardSettings.optionLists.hospitalSettings],
  );

  const ageGroups = useMemo(
    () =>
      mergeUniqueOptions(
        boardSettings.optionLists.ageGroupOptions,
        therapists.flatMap((t) => t.ageGroups ?? []),
      ),
    [therapists, boardSettings.optionLists.ageGroupOptions],
  );

  const genders = useMemo(
    () => mergeUniqueOptions(boardSettings.optionLists.genderOptions, therapists.map((t) => t.gender)),
    [therapists, boardSettings.optionLists.genderOptions],
  );

  const languages = useMemo(
    () =>
      mergeUniqueOptions(
        boardSettings.optionLists.languageOptions,
        therapists.flatMap((t) => t.languages ?? []),
      ),
    [therapists, boardSettings.optionLists.languageOptions],
  );

  const practiceAreas = useMemo(
    () =>
      mergeUniqueOptions(
        boardSettings.optionLists.practiceAreaOptions,
        therapists.flatMap((t) => t.areasOfPractice ?? []),
      ),
    [therapists, boardSettings.optionLists.practiceAreaOptions],
  );

  const assessmentTypes = useMemo(
    () =>
      mergeUniqueOptions(
        boardSettings.optionLists.assessmentTypeOptions,
        therapists.flatMap((t) => t.assessmentTypes ?? []),
      ),
    [therapists, boardSettings.optionLists.assessmentTypeOptions],
  );

  const filtered = useMemo(() => {
    let rows = [...therapists];
    if (show.search.visible && query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((t) =>
        [
          t.name,
          t.specialty,
          hospitalLabel(t.hospital),
          t.gender,
          ...(t.ageGroups ?? []),
          ...(t.languages ?? []),
          ...(t.areasOfPractice ?? []),
          ...(t.assessmentTypes ?? []),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q)),
      );
    }
    if (show.hpcsa.visible && specialty !== "ALL") {
      rows = rows.filter((t) => t.specialty === specialty);
    }
    if (show.hospital.visible && hospital !== "ALL") {
      rows = rows.filter((t) => t.hospital === hospital);
    }
    if (show.status.visible) {
      if (status === "NONE") {
        rows = rows.filter((t) => !t.availability);
      } else if (status !== "ALL") {
        rows = rows.filter((t) => t.availability?.status === status);
      }
    }
    if (show.ageGroups.visible && ageGroup !== "ALL") {
      rows = rows.filter((t) => matchesAgeGroupFilter(t.ageGroups, ageGroup));
    }
    if (show.gender.visible && gender !== "ALL") {
      rows = rows.filter((t) => t.gender === gender);
    }
    if (show.languages.visible && language !== "ALL") {
      rows = rows.filter((t) => t.languages?.includes(language));
    }
    if (show.areasOfPractice.visible && areaOfPractice !== "ALL") {
      rows = rows.filter((t) => t.areasOfPractice?.includes(areaOfPractice));
    }
    if (show.assessments.visible) {
      if (assessmentOffer === "YES") {
        rows = rows.filter((t) => t.offersAssessments === true);
      } else if (assessmentOffer === "NO") {
        rows = rows.filter((t) => t.offersAssessments === false);
      }
      if (assessmentOffer !== "NO" && assessmentType !== "ALL") {
        rows = rows.filter((t) => t.assessmentTypes?.includes(assessmentType));
      }
    }
    const dir = show.sort.visible ? sort : "asc";
    rows.sort((a, b) => (dir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
    return rows;
  }, [
    therapists,
    query,
    sort,
    status,
    specialty,
    hospital,
    ageGroup,
    gender,
    language,
    areaOfPractice,
    assessmentOffer,
    assessmentType,
    show,
  ]);

  const columns = {
    AVAILABLE: filtered.filter((t) => t.availability?.status === CapacityStatus.AVAILABLE),
    SOME_CAPACITY: filtered.filter((t) => t.availability?.status === CapacityStatus.SOME_CAPACITY),
    NO_CAPACITY: filtered.filter((t) => t.availability?.status === CapacityStatus.NO_CAPACITY),
    NONE: filtered.filter((t) => !t.availability),
  };

  const hasFilterBar =
    Object.values(show).some((filter) => filter.visible) || boardSettings.showViewOptions;

  return (
    <div className="space-y-5">
      {hasFilterBar && (
      <section className="glass rounded-[28px] p-4 sm:p-5">
        {(show.search.visible || show.sort.visible || boardSettings.showViewOptions) && (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            {show.search.visible ? (
              <div className="field max-w-md flex-1">
                <label htmlFor="search">Search</label>
                <input
                  id="search"
                  placeholder="Find a psychologist…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            ) : (
              <div className="flex-1" />
            )}
            <div className="flex flex-wrap gap-2">
              {boardSettings.showViewOptions &&
                PSYCHIATRIST_VIEWS.map((option) => (
                  <button
                    key={option.id}
                    className="chip"
                    data-active={view === option.id ? "true" : "false"}
                    onClick={() => setView(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              {show.sort.visible && (
                <button
                  className="chip"
                  data-active={sort === "asc" ? "true" : "false"}
                  onClick={() => setSort(sort === "asc" ? "desc" : "asc")}
                >
                  {sort === "asc" ? "A → Z" : "Z → A"}
                </button>
              )}
            </div>
          </div>
        )}

        {show.status.visible && (
          <div className={`${show.search.visible || show.sort.visible || boardSettings.showViewOptions ? "mt-4" : ""} flex flex-wrap gap-2`}>
            {(
              [
                ["ALL", "All"],
                [CapacityStatus.AVAILABLE, "Available"],
                [CapacityStatus.SOME_CAPACITY, "Some capacity"],
                [CapacityStatus.NO_CAPACITY, "No capacity"],
                ["NONE", "Not updated"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className="chip"
                data-active={status === value ? "true" : "false"}
                onClick={() => setStatus(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {show.hospital.visible && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="chip"
              data-active={hospital === "ALL" ? "true" : "false"}
              onClick={() => setHospital("ALL")}
            >
              All hospitals
            </button>
            {hospitals.map((option) => (
              <button
                key={option}
                className="chip"
                data-active={hospital === option ? "true" : "false"}
                onClick={() => setHospital(option)}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {show.gender.visible && genders.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="chip"
              data-active={gender === "ALL" ? "true" : "false"}
              onClick={() => setGender("ALL")}
            >
              All genders
            </button>
            {genders.map((option) => (
              <button
                key={option}
                className="chip"
                data-active={gender === option ? "true" : "false"}
                onClick={() => setGender(option)}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {show.languages.visible && languages.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="chip"
              data-active={language === "ALL" ? "true" : "false"}
              onClick={() => setLanguage("ALL")}
            >
              All languages
            </button>
            {languages.map((option) => (
              <button
                key={option}
                className="chip"
                data-active={language === option ? "true" : "false"}
                onClick={() => setLanguage(option)}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {show.assessments.visible && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["ALL", "All assessments"],
                ["YES", "Offers assessments"],
                ["NO", "No assessments"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className="chip"
                data-active={assessmentOffer === value ? "true" : "false"}
                onClick={() => setAssessmentOffer(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {(show.hpcsa.visible ||
          show.ageGroups.visible ||
          show.areasOfPractice.visible ||
          (show.assessments.visible && assessmentOffer !== "NO")) && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {show.hpcsa.visible && (
              <div className="field">
                <label htmlFor="specialty">HPCSA Registration Category</label>
                <select id="specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                  <option value="ALL">All categories</option>
                  {specialties.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {show.ageGroups.visible && (
              <div className="field">
                <label htmlFor="ageGroup">Preferred patient age groups</label>
                <select id="ageGroup" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
                    <option value="ALL">Any age group</option>
                  {ageGroups.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {show.areasOfPractice.visible && (
              <div className="field">
                <label htmlFor="areaOfPractice">Areas of practice</label>
                <select
                  id="areaOfPractice"
                  value={areaOfPractice}
                  onChange={(e) => setAreaOfPractice(e.target.value)}
                >
                  <option value="ALL">All areas</option>
                  {practiceAreas.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {show.assessments.visible && assessmentOffer !== "NO" && (
              <div className="field">
                <label htmlFor="assessmentType">Assessment type</label>
                <select
                  id="assessmentType"
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value)}
                >
                  <option value="ALL">All types</option>
                  {assessmentTypes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </section>
      )}

      {loading ? (
        <p className="text-[var(--muted)]">Loading board…</p>
      ) : view === "table" ? (
        <CapacityTable therapists={filtered} />
      ) : view === "three" ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <BoardColumn
              title="Available"
              accent="var(--green)"
              soft="var(--green-soft)"
              items={columns.AVAILABLE}
              delay={0}
            />
            <BoardColumn
              title="Some capacity"
              accent="var(--amber)"
              soft="var(--amber-soft)"
              items={columns.SOME_CAPACITY}
              delay={80}
            />
            <BoardColumn
              title="No capacity"
              accent="var(--red)"
              soft="var(--red-soft)"
              items={columns.NO_CAPACITY}
              delay={160}
            />
          </div>
          {(status === "ALL" || status === "NONE") && columns.NONE.length > 0 && (
            <BoardColumn
              title="Not updated today"
              accent="var(--muted)"
              soft="rgba(255,255,255,0.55)"
              items={columns.NONE}
              delay={220}
            />
          )}
        </div>
      ) : (
        <div className="column-in space-y-3">
          {filtered.length === 0 ? (
            <p className="text-[var(--muted)]">No therapists match these filters.</p>
          ) : (
            filtered.map((t, i) => <TherapistBubble key={t.id} therapist={t} delayMs={i * 40} />)
          )}
        </div>
      )}
    </div>
  );
}

function CapacityTable({ therapists }: { therapists: TherapistBoardItem[] }) {
  if (therapists.length === 0) {
    return <p className="text-[var(--muted)]">No therapists match these filters.</p>;
  }

  return (
    <div className="glass column-in overflow-hidden rounded-[28px]">
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--line)] bg-white/50 text-[10px] uppercase tracking-[0.06em] text-[var(--muted)] sm:text-xs sm:tracking-[0.08em]">
            <th className="w-[40%] px-2 py-3 font-semibold sm:w-auto sm:px-5 sm:py-3.5">Therapist</th>
            <th
              className="w-[20%] px-1 py-3 text-center font-semibold sm:w-auto sm:px-3 sm:py-3.5"
              style={{ color: "var(--green)" }}
            >
              <span className="sm:hidden">Avail</span>
              <span className="hidden sm:inline">Available</span>
            </th>
            <th
              className="w-[20%] px-1 py-3 text-center font-semibold sm:w-auto sm:px-3 sm:py-3.5"
              style={{ color: "var(--amber)" }}
            >
              <span className="sm:hidden">Some</span>
              <span className="hidden sm:inline">Some capacity</span>
            </th>
            <th
              className="w-[20%] px-1 py-3 text-center font-semibold sm:w-auto sm:px-3 sm:py-3.5"
              style={{ color: "var(--red)" }}
            >
              <span className="sm:hidden">None</span>
              <span className="hidden sm:inline">No capacity</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {therapists.map((t, i) => {
            const status = t.availability?.status ?? null;
            const slots = t.availability?.slots;
            const hospital = hospitalLabel(t.hospital);
            return (
              <tr
                key={t.id}
                className="rise-in border-b border-[var(--line)] last:border-b-0"
                style={{ animationDelay: `${i * 35}ms` }}
              >
                <td className="px-2 py-2.5 sm:px-5 sm:py-3">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold text-white sm:h-9 sm:w-9 sm:text-xs"
                      style={{ background: "var(--ink)" }}
                    >
                      {t.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials(t.name)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--ink)] sm:text-base">
                        {t.name}
                      </p>
                      <p className="truncate text-[10px] text-[var(--muted)] sm:text-xs">
                        {[t.specialty ?? "Therapist", hospital].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                </td>
                <StatusCell
                  active={status === CapacityStatus.AVAILABLE}
                  tone="green"
                  value={status === CapacityStatus.AVAILABLE ? String(slots ?? "✓") : null}
                />
                <StatusCell
                  active={status === CapacityStatus.SOME_CAPACITY}
                  tone="amber"
                  value={status === CapacityStatus.SOME_CAPACITY ? String(slots ?? "✓") : null}
                />
                <StatusCell
                  active={status === CapacityStatus.NO_CAPACITY}
                  tone="red"
                  value={status === CapacityStatus.NO_CAPACITY ? "—" : null}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusCell({
  active,
  tone,
  value,
}: {
  active: boolean;
  tone: "green" | "amber" | "red";
  value: string | null;
}) {
  const styles = {
    green: { bg: "var(--green-soft)", ink: "var(--green)" },
    amber: { bg: "var(--amber-soft)", ink: "var(--amber)" },
    red: { bg: "var(--red-soft)", ink: "var(--red)" },
  }[tone];

  return (
    <td className="px-1 py-2.5 text-center align-middle sm:px-3 sm:py-3">
      {active ? (
        <span
          className="inline-flex min-w-[1.75rem] items-center justify-center rounded-full px-1.5 py-1 text-xs font-bold sm:min-w-[3rem] sm:px-3 sm:py-1.5 sm:text-sm"
          style={{ background: styles.bg, color: styles.ink }}
        >
          {value}
        </span>
      ) : (
        <span className="text-sm text-[var(--muted)]/40">·</span>
      )}
    </td>
  );
}

function BoardColumn({
  title,
  accent,
  soft,
  items,
  delay,
  emptyHint,
}: {
  title: string;
  accent: string;
  soft: string;
  items: TherapistBoardItem[];
  delay: number;
  emptyHint?: string;
}) {
  return (
    <section
      className="column-in rounded-[28px] p-3 sm:p-4"
      style={{
        background: soft,
        animationDelay: `${delay}ms`,
        border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)`,
      }}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-bold uppercase tracking-[0.08em]" style={{ color: accent }}>
          {title}
        </h2>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
          style={{ background: accent }}
        >
          {items.length}
        </span>
      </div>
      <div className="space-y-2.5">
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-[var(--muted)]">
            {emptyHint ?? "Nobody here yet"}
          </p>
        ) : (
          items.map((t, i) => <TherapistBubble key={t.id} therapist={t} delayMs={i * 45} />)
        )}
      </div>
    </section>
  );
}
