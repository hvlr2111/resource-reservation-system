"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  MAX_ACTIVE_BOOKINGS_PER_MEMBER,
  validateReservationTimes,
} from "@/lib/booking-rules";

const reservationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: "Enter a title for this reservation." })
    .max(100, { error: "The title must be 100 characters or fewer." }),
  startTime: z.iso.datetime({ error: "Choose a valid start time." }),
  endTime: z.iso.datetime({ error: "Choose a valid end time." }),
});

const resourceIdSchema = z.string().uuid({ error: "Invalid resource." });
const reservationIdSchema = z.string().uuid({ error: "Invalid reservation." });

export type ReservationFormState = {
  errors?: {
    title?: string[];
    startTime?: string[];
    endTime?: string[];
  };
  message?: string;
  success?: boolean;
  reservationId?: string;
} | null;

export type CancelReservationState = {
  message?: string;
  success?: boolean;
} | null;

const overlapMessage =
  "This resource is already booked for that time. Please pick another slot.";

function isOverlapConstraintError(error: unknown) {
  if (!(error instanceof Error)) return false;
  if (error.message.includes("no_overlapping_reservations")) return true;

  const databaseError = error as Error & {
    code?: string;
    meta?: Record<string, unknown> & { code?: string; message?: string };
  };
  const metaMessage = JSON.stringify(databaseError.meta ?? {});

  return (
    databaseError.code === "23P01" ||
    databaseError.meta?.code === "23P01" ||
    databaseError.meta?.message?.includes("no_overlapping_reservations") === true ||
    metaMessage.includes("no_overlapping_reservations")
  );
}

export async function createReservation(
  resourceId: string,
  _previousState: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  const user = await requireUser();
  const parsedResourceId = resourceIdSchema.safeParse(resourceId);
  if (!parsedResourceId.success) {
    return { message: "A valid resource is required." };
  }
  const parsed = reservationSchema.safeParse({
    title: formData.get("title"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { title } = parsed.data;
  const resourceIdValue = parsedResourceId.data;
  const startTime = new Date(parsed.data.startTime);
  const endTime = new Date(parsed.data.endTime);
  const now = new Date();

  const resource = await prisma.resource.findUnique({
    where: { id: resourceIdValue },
    select: { isActive: true, maxDurationHours: true },
  });
  if (!resource || !resource.isActive) {
    return { message: "This resource is unavailable for booking." };
  }

  const timeError = validateReservationTimes({
    start: startTime,
    end: endTime,
    now,
    maxDurationHours: resource.maxDurationHours,
  });
  if (timeError) {
    return { message: timeError };
  }

  if (user.role === "MEMBER") {
    const activeBookings = await prisma.reservation.count({
      where: {
        userId: user.id,
        status: "CONFIRMED",
        endTime: { gt: now },
      },
    });
    if (activeBookings >= MAX_ACTIVE_BOOKINGS_PER_MEMBER) {
      return {
        message: `Members may have at most ${MAX_ACTIVE_BOOKINGS_PER_MEMBER} active reservations.`,
      };
    }
  }

  const overlappingReservation = await prisma.reservation.findFirst({
    where: {
      resourceId: resourceIdValue,
      status: "CONFIRMED",
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    select: { id: true },
  });
  if (overlappingReservation) {
    return { message: overlapMessage };
  }

  try {
    const reservation = await prisma.reservation.create({
      data: {
        resourceId: resourceIdValue,
        userId: user.id,
        title,
        startTime,
        endTime,
      },
      select: { id: true },
    });
    return { success: true, reservationId: reservation.id };
  } catch (error) {
    if (isOverlapConstraintError(error)) {
      return { message: overlapMessage };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        message: "Could not create the reservation. Please try again.",
      };
    }
    throw error;
  }
}

export async function cancelReservation(
  _previousState: CancelReservationState,
  formData: FormData,
): Promise<CancelReservationState> {
  const user = await requireUser();
  const parsedId = reservationIdSchema.safeParse(formData.get("reservationId"));
  if (!parsedId.success) {
    return { message: "A valid reservation is required." };
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: parsedId.data },
    select: { userId: true, status: true, endTime: true },
  });
  if (!reservation) {
    return { message: "Reservation not found." };
  }
  if (reservation.userId !== user.id && user.role !== "ADMIN") {
    return { message: "You are not allowed to cancel this reservation." };
  }
  if (reservation.status !== "CONFIRMED") {
    return { message: "This reservation has already been cancelled." };
  }
  if (reservation.endTime <= new Date()) {
    return { message: "Reservations that have ended cannot be cancelled." };
  }

  const result = await prisma.reservation.updateMany({
    where: {
      id: parsedId.data,
      status: "CONFIRMED",
      endTime: { gt: new Date() },
    },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  if (result.count === 0) {
    return {
      message: "This reservation has already ended or been cancelled.",
    };
  }
  return { success: true, message: "Reservation cancelled." };
}
