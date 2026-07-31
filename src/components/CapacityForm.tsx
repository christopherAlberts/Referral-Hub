"use client";

import { FormEvent, useEffect, useState } from "react";
import { CapacityStatus } from "@prisma/client";

type Availability = {
  status: CapacityStatus;
  slots: number | null;
  updatedAt?: string;
} | null;

const options: { status: CapacityStatus; title: string; hint: string; color: string; soft: string }[] = [
  {
    status: CapacityStatus.AVAILABLE,
    title: "Available",
    hint: "Ready for referrals — how many patients can you see?",
    color: "var(--green)",
    soft: "var(--green-soft)",
  },
  {
    status: CapacityStatus.SOME_CAPACITY,
    title: "Some capacity",
    hint: "Limited openings — set remaining slots.",
    color: "var(--amber)",
    soft: "var(--amber-soft)",
  },
  {
    status: CapacityStatus.NO_CAPACITY,
    title: "No capacity",
    hint: "Fully booked or unavailable today.",
    color: "var(--red)",
    soft: "var(--red-soft)",
  },
];

export function CapacityForm() {
  const [availability, setAvailability] = useState<Availability>(null);
  const [status, setStatus] = useState<CapacityStatus>(CapacityStatus.AVAILABLE);
  const [slots, setSlots] = useState(3);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/availability")
      .then((r) => r.json())
      .then((data) => {
        if (data.availability) {
          setAvailability(data.availability);
          setStatus(data.availability.status);
          if (data.availability.slots) setSlots(data.availability.slots);
        }
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        slots: status === CapacityStatus.NO_CAPACITY ? null : slots,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage("Could not save. Check your slots and try again.");
      return;
    }
    const data = await res.json();
    setAvailability(data.availability);
    setMessage("Today’s capacity is updated.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <section className="glass rounded-[28px] p-5">
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
          Today’s capacity
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Psychiatrists see this on the live board. Update once each morning.
        </p>
        {availability?.updatedAt && (
          <p className="mt-3 text-xs font-medium text-[var(--accent)]">
            Last updated {new Date(availability.updatedAt).toLocaleString()}
          </p>
        )}
      </section>

      <div className="grid gap-3">
        {options.map((opt) => {
          const active = status === opt.status;
          return (
            <button
              key={opt.status}
              type="button"
              className="rounded-[24px] p-4 text-left transition"
              style={{
                background: opt.soft,
                outline: active ? `3px solid ${opt.color}` : "3px solid transparent",
                transform: active ? "scale(1.01)" : undefined,
              }}
              onClick={() => setStatus(opt.status)}
            >
              <p className="font-bold" style={{ color: opt.color }}>
                {opt.title}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">{opt.hint}</p>
            </button>
          );
        })}
      </div>

      {status !== CapacityStatus.NO_CAPACITY && (
        <div className="glass rounded-[24px] p-4">
          <div className="field">
            <label htmlFor="slots">How many patients can you see?</label>
            <input
              id="slots"
              type="number"
              min={1}
              max={50}
              value={slots}
              onChange={(e) => setSlots(Number(e.target.value))}
              required
            />
          </div>
        </div>
      )}

      <button className="btn w-full sm:w-auto" disabled={saving}>
        {saving ? "Saving…" : "Save today’s status"}
      </button>
      {message && <p className="text-sm font-medium text-[var(--green)]">{message}</p>}
    </form>
  );
}
