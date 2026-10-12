import { Suspense } from "react";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LocalDateTime } from "@/components/local-date-time";
import { CancelReservationButton } from "./cancel-reservation-button";
import { PageLoading } from "@/components/page-loading";

export default function ReservationsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MyReservations />
    </Suspense>
  );
}

async function MyReservations() {
  const user = await requireUser();
  const reservations = await prisma.reservation.findMany({
    where: { userId: user.id },
    include: { resource: { select: { name: true } } },
    orderBy: { startTime: "desc" },
  });
  const now = new Date();
  const upcoming = reservations.filter(
    (reservation) =>
      reservation.status === "CONFIRMED" && reservation.endTime > now,
  );
  const pastOrCancelled = reservations.filter(
    (reservation) => !upcoming.includes(reservation),
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">My Reservations</h1>
        <p className="mt-2 text-muted-foreground">
          View and manage your resource bookings.
        </p>
      </header>
      {reservations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg text-muted-foreground">
              You have no reservations yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <ReservationSection
            title="Upcoming"
            reservations={upcoming}
            emptyMessage="You have no upcoming reservations."
          />
          <ReservationSection
            title="Past / Cancelled"
            reservations={pastOrCancelled}
            emptyMessage="You have no past or cancelled reservations."
          />
        </div>
      )}
    </main>
  );
}

type ReservationItem = Prisma.ReservationGetPayload<{
  include: { resource: { select: { name: true } } };
}>;

function ReservationSection({
  title,
  reservations,
  emptyMessage,
}: {
  title: string;
  reservations: ReservationItem[];
  emptyMessage: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {reservations.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="grid gap-4">
          {reservations.map((reservation) => {
            const canCancel =
              reservation.status === "CONFIRMED" &&
              reservation.endTime > new Date();

            return (
              <Card key={reservation.id}>
                <CardContent className="flex flex-col justify-between gap-4 pt-6 sm:flex-row sm:items-center">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{reservation.title}</h3>
                      <Badge
                        variant={
                          reservation.status === "CONFIRMED"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {reservation.status === "CONFIRMED"
                          ? "Confirmed"
                          : "Cancelled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {reservation.resource.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <LocalDateTime value={reservation.startTime} />
                      {" – "}
                      <LocalDateTime value={reservation.endTime} />
                    </p>
                  </div>
                  {canCancel && (
                    <CancelReservationButton reservationId={reservation.id} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
