import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { getDay } from "date-fns";

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
