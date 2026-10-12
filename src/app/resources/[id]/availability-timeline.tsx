"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CLOSE_HOUR,
  OPEN_HOUR,
  WORKING_DAYS,
} from "@/lib/booking-rules";
import {
  addDaysToDateString,
  colomboDateTimeLocalToUtc,
  formatColomboTime,
} from "@/lib/dates";

type TimelineReservation = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  bookedBy: string;
};

const VISIBLE_MINUTES = (CLOSE_HOUR - OPEN_HOUR) * 60;

function localDateTime(date: string, hour: number) {
  const localValue = `${date}T${String(hour).padStart(2, "0")}:00`;
  return new Date(colomboDateTimeLocalToUtc(localValue));
}

export function AvailabilityTimeline({
  resourceId,
  date,
  reservations,
  isToday,
  currentTime,
}: {
  resourceId: string;
  date: string;
  reservations: TimelineReservation[];
  isToday: boolean;
  currentTime: string;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dayStart = localDateTime(date, OPEN_HOUR);
  const dayEnd = localDateTime(date, CLOSE_HOUR);
  const now = new Date(currentTime);
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const isWorkingDay = WORKING_DAYS.some((workingDay) => workingDay === weekday);
  const currentReservation =
    isToday && isWorkingDay && now >= dayStart && now < dayEnd
      ? reservations.find(
          (reservation) =>
            new Date(reservation.startTime) <= now &&
            new Date(reservation.endTime) > now,
        )
      : undefined;

  function goToDate(nextDate: string) {
    router.push(`/resources/${resourceId}?date=${nextDate}`);
  }

  const visibleReservations = reservations.flatMap((reservation) => {
    const start = new Date(reservation.startTime);
    const end = new Date(reservation.endTime);
    const clippedStart = Math.max(start.getTime(), dayStart.getTime());
    const clippedEnd = Math.min(end.getTime(), dayEnd.getTime());
    if (clippedStart >= clippedEnd) return [];
    return [{
      ...reservation,
      left: ((clippedStart - dayStart.getTime()) / 60_000 / VISIBLE_MINUTES) * 100,
      width: ((clippedEnd - clippedStart) / 60_000 / VISIBLE_MINUTES) * 100,
    }];
  });

  const selected = visibleReservations.find(
    (reservation) => reservation.id === selectedId,
  );
  const summary = !isToday
    ? null
    : !isWorkingDay
      ? "Closed today"
      : currentReservation
      ? `In use until ${formatColomboTime(new Date(currentReservation.endTime))}`
        : now < dayStart || now >= dayEnd
          ? "Outside booking hours"
          : "Available now";

  return (
    <section aria-label="Resource availability" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Previous day"
            onClick={() => goToDate(addDaysToDateString(date, -1))}
          >
            Previous day
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Next day"
            onClick={() => goToDate(addDaysToDateString(date, 1))}
          >
            Next day
          </Button>
        </div>
        <Input
          aria-label="Choose availability date"
          className="w-auto"
          type="date"
          value={date}
          onChange={(event) => {
            if (event.currentTarget.value) goToDate(event.currentTarget.value);
          }}
        />
      </div>

      {summary && (
        <p className="text-sm font-medium" aria-live="polite">
          {summary}
        </p>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[640px]">
          <div
            className={`relative h-14 rounded-md border ${
              isWorkingDay ? "bg-muted/30" : "bg-muted"
            }`}
          >
            {!isWorkingDay && (
              <span className="absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                Closed
              </span>
            )}
            {Array.from({ length: CLOSE_HOUR - OPEN_HOUR + 1 }, (_, index) => (
              <div
                key={index}
                className="absolute inset-y-0 z-0 border-l"
                style={{
                  left: `${(index / (CLOSE_HOUR - OPEN_HOUR)) * 100}%`,
                }}
              >
                <span className="absolute -bottom-6 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground">
                  {formatColomboTime(localDateTime(date, OPEN_HOUR + index))}
                </span>
              </div>
            ))}
            {visibleReservations.map((reservation) => (
              <button
                key={reservation.id}
                type="button"
                title={`${reservation.title} · ${formatColomboTime(new Date(reservation.startTime))}–${formatColomboTime(new Date(reservation.endTime))} · Booked by ${reservation.bookedBy}`}
                aria-label={`${reservation.title}, ${formatColomboTime(new Date(reservation.startTime))} to ${formatColomboTime(new Date(reservation.endTime))}, booked by ${reservation.bookedBy}`}
                aria-pressed={selectedId === reservation.id}
                onClick={() =>
                  setSelectedId((current) =>
                    current === reservation.id ? null : reservation.id,
                  )
                }
                className="absolute top-2 z-10 h-10 overflow-hidden rounded bg-primary px-1 text-left text-xs text-primary-foreground outline-none ring-offset-2 hover:bg-primary/80 focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  left: `${reservation.left}%`,
                  width: `${reservation.width}%`,
                }}
              >
                <span className="block truncate">{reservation.title}</span>
              </button>
            ))}
          </div>
          {selected && (
            <div className="mt-8 rounded-md border p-3 text-sm" aria-live="polite">
              <p className="font-medium">{selected.title}</p>
              <p className="text-muted-foreground">
                {formatColomboTime(new Date(selected.startTime))}
                {" – "}
                {formatColomboTime(new Date(selected.endTime))}
                {" · Booked by "}
                {selected.bookedBy}
              </p>
            </div>
          )}
        </div>
      </div>
      {visibleReservations.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No reservations during {String(OPEN_HOUR).padStart(2, "0")}:00–
          {String(CLOSE_HOUR).padStart(2, "0")}:00. The day is available.
        </p>
      )}
    </section>
  );
}
