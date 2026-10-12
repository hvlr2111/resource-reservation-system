"use client";

import { addDays, format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TimelineReservation = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  bookedBy: string;
};

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;
const VISIBLE_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;

function localDateTime(date: string, hour: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, hour);
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AvailabilityTimeline({
  resourceId,
  date,
  reservations,
  isToday,
}: {
  resourceId: string;
  date: string;
  reservations: TimelineReservation[];
  isToday: boolean;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dayStart = localDateTime(date, DAY_START_HOUR);
  const dayEnd = localDateTime(date, DAY_END_HOUR);
  const now = new Date();
  const currentReservation =
    isToday && now >= dayStart && now < dayEnd
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
  const summary = currentReservation
    ? `In use until ${formatTime(new Date(currentReservation.endTime))}`
    : isToday
      ? "Available now"
      : null;

  return (
    <section aria-label="Resource availability" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Previous day"
            onClick={() => goToDate(format(addDays(parseISO(date), -1), "yyyy-MM-dd"))}
          >
            Previous day
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Next day"
            onClick={() => goToDate(format(addDays(parseISO(date), 1), "yyyy-MM-dd"))}
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
          <div className="relative h-14 rounded-md border bg-muted/30">
            {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, index) => (
              <div
                key={index}
                className="absolute inset-y-0 border-l"
                style={{
                  left: `${(index / (DAY_END_HOUR - DAY_START_HOUR)) * 100}%`,
                }}
              >
                <span className="absolute -bottom-6 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground">
                  {formatTime(localDateTime(date, DAY_START_HOUR + index))}
                </span>
              </div>
            ))}
            {visibleReservations.map((reservation) => (
              <button
                key={reservation.id}
                type="button"
                title={`${reservation.title} · ${formatTime(new Date(reservation.startTime))}–${formatTime(new Date(reservation.endTime))} · Booked by ${reservation.bookedBy}`}
                aria-label={`${reservation.title}, ${formatTime(new Date(reservation.startTime))} to ${formatTime(new Date(reservation.endTime))}, booked by ${reservation.bookedBy}`}
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
                {formatTime(new Date(selected.startTime))}
                {" – "}
                {formatTime(new Date(selected.endTime))}
                {" · Booked by "}
                {selected.bookedBy}
              </p>
            </div>
          )}
        </div>
      </div>
      {visibleReservations.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No reservations during 7:00 AM–9:00 PM. The day is available.
        </p>
      )}
    </section>
  );
}
