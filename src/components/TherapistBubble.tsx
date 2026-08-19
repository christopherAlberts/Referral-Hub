"use client";

import { CapacityStatus } from "@prisma/client";
import { hospitalLabel } from "@/lib/therapist-fields";
import { initials } from "@/lib/utils";

export type TherapistBoardItem = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  specialty?: string | null;
  hospital?: string | null;
  ageGroups?: string[];
  gender?: string | null;
  languages?: string[];
  areasOfPractice?: string[];
  offersAssessments?: boolean | null;
  assessmentTypes?: string[];
  availability: {
    status: CapacityStatus;
    slots: number | null;
    updatedAt?: string | Date;
  } | null;
};

const tone: Record<CapacityStatus | "NONE", { bg: string; ink: string; ring: string; label: string }> = {
  AVAILABLE: {
    bg: "var(--green-soft)",
    ink: "var(--green)",
    ring: "rgba(31,157,106,0.35)",
    label: "Available",
  },
  SOME_CAPACITY: {
    bg: "var(--amber-soft)",
    ink: "var(--amber)",
    ring: "rgba(201,133,18,0.35)",
    label: "Some capacity",
  },
  NO_CAPACITY: {
    bg: "var(--red-soft)",
    ink: "var(--red)",
    ring: "rgba(214,69,69,0.35)",
    label: "No capacity",
  },
  NONE: {
    bg: "rgba(255,255,255,0.85)",
    ink: "var(--muted)",
    ring: "rgba(15,27,45,0.08)",
    label: "Not updated",
  },
};

export function TherapistBubble({
  therapist,
  delayMs = 0,
}: {
  therapist: TherapistBoardItem;
  delayMs?: number;
}) {
  const status = therapist.availability?.status ?? null;
  const t = tone[status ?? "NONE"];
  const slots = therapist.availability?.slots;

  return (
    <article
      className="bubble rise-in flex items-center gap-3 px-3 py-3"
      style={{
        background: t.bg,
        boxShadow: `0 10px 28px ${t.ring}`,
        animationDelay: `${delayMs}ms`,
      }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white"
        style={{ background: t.ink }}
      >
        {therapist.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={therapist.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials(therapist.name)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[var(--ink)]">{therapist.name}</p>
        <p className="truncate text-xs text-[var(--muted)]">
          {[therapist.specialty ?? "Therapist", hospitalLabel(therapist.hospital)]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: t.ink }}>
          {t.label}
        </p>
        {slots != null && (
          <p className="text-lg font-bold leading-none" style={{ color: t.ink }}>
            {slots}
            <span className="ml-1 text-xs font-medium opacity-80">slots</span>
          </p>
        )}
      </div>
    </article>
  );
}
