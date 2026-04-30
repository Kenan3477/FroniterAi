import { startOfDay, endOfDay } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

export function getDashboardStatsTimezone(): string {
  const raw = process.env.DASHBOARD_STATS_TIMEZONE?.trim();
  if (raw) return raw;
  return 'Europe/London';
}

export function getUtcRangeForZonedCalendarDay(
  instant: Date,
  timeZone: string,
): { startUtc: Date; endUtc: Date } {
  const zoned = utcToZonedTime(instant, timeZone);
  const zonedStart = startOfDay(zoned);
  const zonedEnd = endOfDay(zoned);
  return {
    startUtc: zonedTimeToUtc(zonedStart, timeZone),
    endUtc: zonedTimeToUtc(zonedEnd, timeZone),
  };
}

export function formatZonedDateKey(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}
