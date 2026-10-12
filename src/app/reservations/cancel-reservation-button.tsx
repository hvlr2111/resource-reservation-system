"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  cancelReservation,
  type CancelReservationState,
} from "@/app/actions/reservations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CancelReservationButton({
  reservationId,
}: {
  reservationId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<
    CancelReservationState,
    FormData
  >(cancelReservation, null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message ?? "Reservation cancelled.");
      router.refresh();
    } else if (state?.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Cancel
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this reservation?</DialogTitle>
          <DialogDescription>
            This will release the reserved time for other users.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="reservationId" value={reservationId} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Keep reservation
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Cancelling..." : "Confirm cancellation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
