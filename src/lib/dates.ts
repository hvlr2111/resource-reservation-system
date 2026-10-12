import {
  CLOSE_HOUR,
  MAX_ADVANCE_DAYS,
  MIN_DURATION_MINUTES,
  OPEN_HOUR,
  SL_UTC_OFFSET_MINUTES,
  SLOT_MINUTES,
  WORKING_DAYS,
} from "@/lib/booking-rules";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const COLOMBO_TIME_ZONE = "Asia/Colombo";

const dateTimeFormatter = new Intl.DateTimeFormat("en-LK", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: COLOMBO_TIME_ZONE,
});
const dateFormatter = new Intl.DateTimeFormat("en-LK", {
  dateStyle: "medium",
  timeZone: COLOMBO_TIME_ZONE,
});
const timeFormatter = new Intl.DateTimeFormat("en-LK", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: COLOMBO_TIME_ZONE,
});
const localDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: COLOMBO_TIME_ZONE,
});

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function formatColomboDateTime(value: Date | string) {
  return dateTimeFormatter.format(asDate(value));
}

export function formatColomboDate(value: Date | string) {
  return dateFormatter.format(asDate(value));
}

export function formatColomboTime(value: Date | string) {
  return timeFormatter.format(asDate(value));
}

export function getColomboDate(value: Date = new Date()) {
  const parts = localDateTimeFormatter.formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function addDaysToDateString(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

export function colomboMidnight(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(
    Date.UTC(year, month - 1, day) -
      SL_UTC_OFFSET_MINUTES * MINUTE_MS,
  );
}

export function formatColomboDateTimeLocal(value: Date | string) {
  const parts = localDateTimeFormatter.formatToParts(asDate(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function colomboDateTimeLocalToUtc(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Invalid Colombo local date and time.");

  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const localTimestamp = Date.UTC(year, month - 1, day, hour, minute);
  const normalized = new Date(localTimestamp);
  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() !== month - 1 ||
    normalized.getUTCDate() !== day ||
    normalized.getUTCHours() !== hour ||
    normalized.getUTCMinutes() !== minute
  ) {
    throw new Error("Invalid Colombo local date and time.");
  }

  return new Date(
    localTimestamp - SL_UTC_OFFSET_MINUTES * MINUTE_MS,
  ).toISOString();
}

export function findNextFreeColomboStart(
  now: Date,
  reservations: { startTime: Date | string; endTime: Date | string }[],
) {
  const localNow = new Date(
    now.getTime() + SL_UTC_OFFSET_MINUTES * MINUTE_MS,
  );
  const limit = now.getTime() + MAX_ADVANCE_DAYS * DAY_MS;

  for (let dayOffset = 0; dayOffset <= MAX_ADVANCE_DAYS; dayOffset++) {
    const day = new Date(
      Date.UTC(
        localNow.getUTCFullYear(),
        localNow.getUTCMonth(),
        localNow.getUTCDate() + dayOffset,
      ),
    );
    const weekday = day.getUTCDay();
    if (!WORKING_DAYS.some((workingDay) => workingDay === weekday)) continue;

    const firstMinute =
      dayOffset === 0
        ? Math.max(
            OPEN_HOUR * 60,
            Math.ceil(
              (localNow.getUTCHours() * 60 +
                localNow.getUTCMinutes() +
                (localNow.getUTCSeconds() || localNow.getUTCMilliseconds()
                  ? 1
                  : 0)) /
                SLOT_MINUTES,
            ) * SLOT_MINUTES,
          )
        : OPEN_HOUR * 60;

    for (
      let minuteOfDay = firstMinute;
      minuteOfDay + MIN_DURATION_MINUTES <= CLOSE_HOUR * 60;
      minuteOfDay += SLOT_MINUTES
    ) {
      const date = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, "0")}-${String(day.getUTCDate()).padStart(2, "0")}`;
      const localValue = `${date}T${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`;
      const start = new Date(colomboDateTimeLocalToUtc(localValue));
      const end = new Date(start.getTime() + MIN_DURATION_MINUTES * MINUTE_MS);
      if (start.getTime() > limit) return null;

      const isTaken = reservations.some((reservation) => {
        const reservedStart = asDate(reservation.startTime).getTime();
        const reservedEnd = asDate(reservation.endTime).getTime();
        return start.getTime() < reservedEnd && end.getTime() > reservedStart;
      });
      if (!isTaken) return localValue;
    }
  }

  return null;
}
