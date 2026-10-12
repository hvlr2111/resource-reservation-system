export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 20;
export const WORKING_DAYS = [1, 2, 3, 4, 5] as const;
export const SL_UTC_OFFSET_MINUTES = 330;
export const MIN_DURATION_MINUTES = 30;
export const SLOT_MINUTES = 15;
export const MAX_ADVANCE_DAYS = 30;
export const MAX_ACTIVE_BOOKINGS_PER_MEMBER = 5;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export function validateReservationTimes({
  start,
  end,
  now,
  maxDurationHours,
}: {
  start: Date;
  end: Date;
  now: Date;
  maxDurationHours: number;
}): string | null {
  if (end.getTime() <= start.getTime()) {
    return "End time must be after start time.";
  }
  if (start.getTime() < now.getTime()) {
    return "Start time cannot be in the past.";
  }

  const startLocal = new Date(
    start.getTime() + SL_UTC_OFFSET_MINUTES * MINUTE_MS,
  );
  const endLocal = new Date(end.getTime() + SL_UTC_OFFSET_MINUTES * MINUTE_MS);
  const onSlotBoundary = (date: Date) =>
    date.getUTCMilliseconds() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMinutes() % SLOT_MINUTES === 0;

  if (!onSlotBoundary(startLocal) || !onSlotBoundary(endLocal)) {
    return "Start and end times must be on 15-minute boundaries.";
  }

  const duration = end.getTime() - start.getTime();
  if (duration < MIN_DURATION_MINUTES * MINUTE_MS) {
    return `Reservations must be at least ${MIN_DURATION_MINUTES} minutes long.`;
  }
  if (duration > maxDurationHours * 60 * MINUTE_MS) {
    return `Reservations cannot be longer than ${maxDurationHours} hours.`;
  }
  if (start.getTime() > now.getTime() + MAX_ADVANCE_DAYS * DAY_MS) {
    return `Reservations can only be made up to ${MAX_ADVANCE_DAYS} days in advance.`;
  }

  if (
    startLocal.getUTCFullYear() !== endLocal.getUTCFullYear() ||
    startLocal.getUTCMonth() !== endLocal.getUTCMonth() ||
    startLocal.getUTCDate() !== endLocal.getUTCDate()
  ) {
    return "Reservations must start and end on the same Colombo calendar day.";
  }

  const weekday = startLocal.getUTCDay();
  if (weekday < 1 || weekday > 5) {
    return "Reservations are only available Monday through Friday.";
  }

  const startMinutes =
    startLocal.getUTCHours() * 60 + startLocal.getUTCMinutes();
  const endMinutes = endLocal.getUTCHours() * 60 + endLocal.getUTCMinutes();
  if (
    startMinutes < OPEN_HOUR * 60 ||
    startMinutes >= CLOSE_HOUR * 60 ||
    endMinutes > CLOSE_HOUR * 60 ||
    endMinutes <= OPEN_HOUR * 60
  ) {
    return `Reservations must be within ${String(OPEN_HOUR).padStart(2, "0")}:00-${String(CLOSE_HOUR).padStart(2, "0")}:00 Colombo time.`;
  }

  return null;
}
