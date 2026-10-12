"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createReservation,
  type ReservationFormState,
} from "@/app/actions/reservations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CLOSE_HOUR,
  MAX_ADVANCE_DAYS,
  MAX_ACTIVE_BOOKINGS_PER_MEMBER,
  MIN_DURATION_MINUTES,
  OPEN_HOUR,
  SLOT_MINUTES,
  SL_UTC_OFFSET_MINUTES,
} from "@/lib/booking-rules";

export function BookingForm({
  resourceId,
  maxDurationHours,
}: {
  resourceId: string;
  maxDurationHours: number;
}) {
  const router = useRouter();
  const action = createReservation.bind(null, resourceId);
  const [state, formAction, pending] = useActionState<
    ReservationFormState,
    FormData
  >(action, null);

  useEffect(() => {
    if (state?.success) {
      toast.success("Reservation created.");
      router.refresh();
    } else if (state?.message) {
      toast.error(state.message);
    } else if (state?.errors) {
      toast.error("Please correct the highlighted fields.");
    }
  }, [state, router]);

  function colomboLocalTimeToUtc(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
    if (!match) throw new Error("Invalid local time.");
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    return new Date(
      Date.UTC(year, month - 1, day, hour, minute) -
        SL_UTC_OFFSET_MINUTES * 60_000,
    ).toISOString();
  }

  function prepareUtcTimes(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const startValue = new FormData(form).get("startLocal");
    const endValue = new FormData(form).get("endLocal");
    if (typeof startValue !== "string" || typeof endValue !== "string") return;

    try {
      const startTime = form.querySelector<HTMLInputElement>(
        'input[name="startTime"]',
      );
      const endTime = form.querySelector<HTMLInputElement>(
        'input[name="endTime"]',
      );
      if (!startTime || !endTime) return;
      startTime.value = colomboLocalTimeToUtc(startValue);
      endTime.value = colomboLocalTimeToUtc(endValue);
    } catch {
      event.preventDefault();
      toast.error("Enter valid start and end times.");
    }
  }

  return (
    <form action={formAction} onSubmit={prepareUtcTimes} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Reservations are available Monday–Friday, {String(OPEN_HOUR).padStart(2, "0")}:00–
        {String(CLOSE_HOUR).padStart(2, "0")}:00 Colombo time, in {SLOT_MINUTES}-minute
        steps. Book at least {MIN_DURATION_MINUTES} minutes and up to{" "}
        {maxDurationHours} {maxDurationHours === 1 ? "hour" : "hours"} per
        reservation, up to {MAX_ADVANCE_DAYS} days ahead. Members can have at
        most {MAX_ACTIVE_BOOKINGS_PER_MEMBER} active bookings.
      </p>
      <input type="hidden" name="startTime" />
      <input type="hidden" name="endTime" />

      <div className="space-y-2">
        <Label htmlFor="reservation-title">Title</Label>
        <Input
          id="reservation-title"
          name="title"
          required
          maxLength={100}
          aria-invalid={Boolean(state?.errors?.title)}
        />
        {state?.errors?.title && (
          <p className="text-sm text-destructive">{state.errors.title[0]}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reservation-start">Start time (Colombo time)</Label>
          <Input
            id="reservation-start"
            name="startLocal"
            type="datetime-local"
            step={SLOT_MINUTES * 60}
            required
            aria-invalid={Boolean(state?.errors?.startTime)}
          />
          {state?.errors?.startTime && (
            <p className="text-sm text-destructive">
              {state.errors.startTime[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="reservation-end">End time (Colombo time)</Label>
          <Input
            id="reservation-end"
            name="endLocal"
            type="datetime-local"
            step={SLOT_MINUTES * 60}
            required
            aria-invalid={Boolean(state?.errors?.endTime)}
          />
          {state?.errors?.endTime && (
            <p className="text-sm text-destructive">{state.errors.endTime[0]}</p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Booking..." : "Book resource"}
      </Button>
    </form>
  );
}
