/**
 * Calendar-day boundaries for dashboard stats.
 * Call timestamps are stored in UTC; operators expect "today" in a business timezone
 * (default Europe/London for UK deployments).
 */
import { startOfDay, endOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export function getDashboardStatsTimezone(): string {
  const raw = process.env.DASHBOARD_STATS_TIMEZONE?.trim();
  if (raw) return raw;
  return 'Europe/London';
}

/** Start/end UTC instants for the calendar day containing `instant` in `timeZone`. */
export function getUtcRangeForZonedCalendarDay(
  instant: Date,
  timeZone: string,
): { startUtc: Date; endUtc: Date } {
  const zoned = toZonedTime(instant, timeZone);
  const zonedStart = startOfDay(zoned);
  const zonedEnd = endOfDay(zoned);
  return {
    startUtc: fromZonedTime(zonedStart, timeZone),
    endUtc: fromZonedTime(zonedEnd, timeZone),
  };
}

/** YYYY-MM-DD for `instant` in `timeZone` (for chart buckets). */
export function formatZonedDateKey(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}
