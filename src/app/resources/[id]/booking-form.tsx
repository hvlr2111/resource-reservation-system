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

export function BookingForm({ resourceId }: { resourceId: string }) {
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
      startTime.value = new Date(startValue).toISOString();
      endTime.value = new Date(endValue).toISOString();
    } catch {
      event.preventDefault();
      toast.error("Enter valid start and end times.");
    }
  }

  return (
    <form action={formAction} onSubmit={prepareUtcTimes} className="space-y-4">
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
          <Label htmlFor="reservation-start">Start time (your local time)</Label>
          <Input
            id="reservation-start"
            name="startLocal"
            type="datetime-local"
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
          <Label htmlFor="reservation-end">End time (your local time)</Label>
          <Input
            id="reservation-end"
            name="endLocal"
            type="datetime-local"
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
