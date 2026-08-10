"use client";

import { useEffect, useMemo, useState } from "react";
import { CapacityStatus } from "@prisma/client";
import { TherapistBubble, type TherapistBoardItem } from "@/components/TherapistBubble";
import { initials } from "@/lib/utils";

type StatusFilter = "ALL" | CapacityStatus | "NONE";
type SortDir = "asc" | "desc";
type ViewMode = "table" | "three" | "one";

export function PsychiatristBoard() {
  const [therapists, setTherapists] = useState<TherapistBoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortDir>("asc");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [specialty, setSpecialty] = useState("ALL");
  const [view, setView] = useState<ViewMode>("table");

  async function load() {
    const res = await fetch("/api/availability", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setTherapists(data.therapists ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const specialties = useMemo(() => {
    const set = new Set<string>();
    therapists.forEach((t) => {
      if (t.specialty) set.add(t.specialty);
    });
    return Array.from(set).sort();
  }, [therapists]);

  const filtered = useMemo(() => {
    let rows = [...therapists];
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.specialty ?? "").toLowerCase().includes(q),
      );
    }
    if (specialty !== "ALL") {
      rows = rows.filter((t) => t.specialty === specialty);
    }
    if (status === "NONE") {
      rows = rows.filter((t) => !t.availability);
    } else if (status !== "ALL") {
      rows = rows.filter((t) => t.availability?.status === status);
    }
    rows.sort((a, b) =>
      sort === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
    );
    return rows;
  }, [therapists, query, sort, status, specialty]);

  const columns = {
    AVAILABLE: filtered.filter((t) => t.availability?.status === CapacityStatus.AVAILABLE),
    SOME_CAPACITY: filtered.filter((t) => t.availability?.status === CapacityStatus.SOME_CAPACITY),
    NO_CAPACITY: filtered.filter((t) => t.availability?.status === CapacityStatus.NO_CAPACITY),
    NONE: filtered.filter((t) => !t.availability),
  };

  return (
    <div className="space-y-5">
      <section className="glass rounded-[28px] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="field max-w-md flex-1">
            <label htmlFor="search">Search</label>
            <input
              id="search"
              placeholder="Find a psychologist…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="chip" data-active={view === "table" ? "true" : "false"} onClick={() => setView("table")}>
              Table
            </button>
            <button className="chip" data-active={view === "three" ? "true" : "false"} onClick={() => setView("three")}>
              3 columns
            </button>
            <button className="chip" data-active={view === "one" ? "true" : "false"} onClick={() => setView("one")}>
              1 column
            </button>
            <button
              className="chip"
              data-active={sort === "asc" ? "true" : "false"}
              onClick={() => setSort(sort === "asc" ? "desc" : "asc")}
            >
              {sort === "asc" ? "A → Z" : "Z → A"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
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

        {specialties.length > 0 && (
          <div className="mt-3 field max-w-xs">
            <label htmlFor="specialty">Specialty</label>
            <select id="specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
              <option value="ALL">All specialties</option>
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

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
                        {t.specialty ?? "Therapist"}
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
