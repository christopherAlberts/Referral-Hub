"use client";

import { useEffect, useMemo, useState } from "react";
import { CapacityStatus } from "@prisma/client";
import { TherapistBubble, type TherapistBoardItem } from "@/components/TherapistBubble";

type StatusFilter = "ALL" | CapacityStatus | "NONE";
type SortDir = "asc" | "desc";
type ViewMode = "three" | "one";

export function PsychiatristBoard() {
  const [therapists, setTherapists] = useState<TherapistBoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortDir>("asc");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [specialty, setSpecialty] = useState("ALL");
  const [view, setView] = useState<ViewMode>("three");

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
