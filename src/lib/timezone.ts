import { addDays, getDay } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { NotifyFrequency } from "@prisma/client";

export function todayInTimezone(timezone: string): Date {
  const dateStr = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function dateStringInTimezone(timezone: string, date = new Date()): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

export function localTimeHHMM(timezone: string, date = new Date()): string {
  return formatInTimeZone(date, timezone, "HH:mm");
}

export function isWeekdayInTimezone(timezone: string, date = new Date()): boolean {
  const zoned = toZonedTime(date, timezone);
  const day = getDay(zoned); // 0 Sun .. 6 Sat
  return day >= 1 && day <= 5;
}

/** Next wall-clock occurrence of HH:mm in the given timezone (DAILY or WEEKDAYS). */
export function nextAlertOccurrence(
  timeLocal: string,
  frequency: NotifyFrequency,
  timezone: string,
  from: Date = new Date(),
): Date {
  const startDateStr = formatInTimeZone(from, timezone, "yyyy-MM-dd");
  const localStart = fromZonedTime(`${startDateStr}T00:00:00`, timezone);

  for (let offset = 0; offset < 8; offset++) {
    const dayDate = addDays(localStart, offset);
    const dateStr = formatInTimeZone(dayDate, timezone, "yyyy-MM-dd");
    const candidate = fromZonedTime(`${dateStr}T${timeLocal}:00`, timezone);
    if (candidate <= from) continue;

    const day = getDay(toZonedTime(candidate, timezone));
    if (frequency === NotifyFrequency.WEEKDAYS && (day === 0 || day === 6)) continue;

    return candidate;
  }

  return addDays(from, 1);
}

export const SCHEDULE_DISPLAY_TZ = "Africa/Johannesburg";

export const COMMON_TIMEZONES = [
  "Africa/Johannesburg",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];
