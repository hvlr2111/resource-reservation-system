import { Suspense } from "react";
import { ReservationStatus, type Prisma } from "@prisma/client";
import { startOfWeek } from "date-fns";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LocalDateTime } from "@/components/local-date-time";
import { ReservationFilters } from "./reservation-filters";
import { ReservationPagination } from "./reservation-pagination";
import { CancelReservationButton } from "@/app/reservations/cancel-reservation-button";

const PAGE_SIZE = 10;
const SRI_LANKA_OFFSET_MINUTES = 5 * 60 + 30;

type QueryValues = Record<string, string | string[] | undefined>;

export default function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<QueryValues>;
}) {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-6xl flex-1 p-6" />}>
      <AdminReservations searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminReservations({
  searchParams,
}: {
  searchParams: Promise<QueryValues>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const [activeResources, allResources, week] = await Promise.all([
    prisma.resource.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.resource.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    currentSriLankaWeek(),
  ]);

  const fromDate = typeof query.from === "string" && validDate(query.from)
    ? query.from
    : "";
  const toDate = typeof query.to === "string" && validDate(query.to)
    ? query.to
    : "";
  const resourceId =
    typeof query.resource === "string" &&
    allResources.some((resource) => resource.id === query.resource)
      ? query.resource
      : "";
  const status: ReservationStatus | undefined =
    query.status === "CONFIRMED"
      ? ReservationStatus.CONFIRMED
      : query.status === "CANCELLED"
        ? ReservationStatus.CANCELLED
        : undefined;
  const filterStatus = status ?? "";
  const parsedPage = typeof query.page === "string" ? Number(query.page) : 1;
  const requestedPage =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const dateWhere = {
    ...(fromDate ? { gte: sriLankaMidnight(fromDate) } : {}),
    ...(toDate ? { lt: sriLankaMidnight(addDate(toDate, 1)) } : {}),
  };
  const where: Prisma.ReservationWhereInput = {
    ...(resourceId ? { resourceId } : {}),
    ...(status ? { status } : {}),
    ...(fromDate || toDate
      ? { startTime: dateWhere }
      : {}),
  };

  const [totalCount, weeklyConfirmedCount, weeklyReservations] =
    await Promise.all([
      prisma.reservation.count({ where }),
      prisma.reservation.count({
        where: {
          status: "CONFIRMED",
          startTime: { gte: week.start, lt: week.end },
        },
      }),
      prisma.reservation.findMany({
        where: {
          status: "CONFIRMED",
          startTime: { lt: week.end },
          endTime: { gt: week.start },
        },
        select: { resourceId: true, startTime: true, endTime: true },
      }),
    ]);

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const reservations = await prisma.reservation.findMany({
    where,
    include: {
      resource: { select: { name: true } },
      user: { select: { name: true } },
    },
    orderBy: { startTime: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  // Utilization is booked time clipped to daily 08:00-20:00 hours, divided by 12 * 7 available hours.
  const usage = activeResources.map((resource) => {
    const matching = weeklyReservations.filter(
      (reservation) => reservation.resourceId === resource.id,
    );
    const bookedHours = matching.reduce(
      (hours, reservation) =>
        hours +
        sriLankaBusinessHoursOverlap(
          reservation.startTime,
          reservation.endTime,
          week.start,
        ),
      0,
    );
    return {
      ...resource,
      bookings: matching.length,
      utilization: Math.min(100, (bookedHours / (12 * 7)) * 100),
    };
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold">All Reservations</h1>
        <p className="mt-2 text-muted-foreground">
          Review bookings and resource usage for this week.
        </p>
      </header>

      <section className="space-y-4" aria-labelledby="usage-heading">
        <h2 id="usage-heading" className="text-xl font-semibold">
          This week&apos;s usage
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>Total confirmed reservations</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {weeklyConfirmedCount}
          </CardContent>
        </Card>
        {usage.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active resources to report.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {usage.map((resource) => (
              <Card key={resource.id}>
                <CardHeader>
                  <CardTitle>{resource.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p>{resource.bookings} bookings this week</p>
                  <p className="text-sm text-muted-foreground">
                    {resource.utilization.toFixed(1)}% utilization
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Reservations</h2>
        <ReservationFilters
          resources={allResources}
          filters={{
            resource: resourceId,
            status: filterStatus,
            from: fromDate,
            to: toDate,
          }}
        />
        {reservations.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No reservations match these filters.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((reservation) => {
                  const canCancel =
                    reservation.status === "CONFIRMED" &&
                    reservation.endTime > new Date();
                  return (
                    <TableRow key={reservation.id}>
                      <TableCell>{reservation.resource.name}</TableCell>
                      <TableCell>{reservation.user.name}</TableCell>
                      <TableCell>{reservation.title}</TableCell>
                      <TableCell>
                        <LocalDateTime value={reservation.startTime} />
                      </TableCell>
                      <TableCell>
                        <LocalDateTime value={reservation.endTime} />
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        {canCancel ? (
                          <CancelReservationButton reservationId={reservation.id} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {totalCount > PAGE_SIZE && (
          <ReservationPagination
            page={page}
            pageCount={pageCount}
            filters={{
              resource: resourceId,
              status: filterStatus,
              from: fromDate,
              to: toDate,
            }}
          />
        )}
      </section>
    </main>
  );
}

function sriLankaMidnight(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(
    Date.UTC(year, month - 1, day) - SRI_LANKA_OFFSET_MINUTES * 60_000,
  );
}

function addDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

async function currentSriLankaWeek() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const localDate = new Date(Date.UTC(value("year"), value("month") - 1, value("day")));
  const monday = startOfWeek(localDate, { weekStartsOn: 1 });
  const startDate = `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, "0")}-${String(monday.getUTCDate()).padStart(2, "0")}`;
  const start = sriLankaMidnight(startDate);
  return { start, end: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000) };
}

function sriLankaBusinessHoursOverlap(
  reservationStart: Date,
  reservationEnd: Date,
  weekStart: Date,
) {
  let milliseconds = 0;
  for (let day = 0; day < 7; day++) {
    const businessStart = new Date(
      weekStart.getTime() +
        day * 24 * 60 * 60 * 1000 +
        8 * 60 * 60 * 1000,
    );
    const businessEnd = new Date(
      businessStart.getTime() + 12 * 60 * 60 * 1000,
    );
    const overlapStart = Math.max(
      reservationStart.getTime(),
      businessStart.getTime(),
    );
    const overlapEnd = Math.min(reservationEnd.getTime(), businessEnd.getTime());
    milliseconds += Math.max(0, overlapEnd - overlapStart);
  }
  return milliseconds / (60 * 60 * 1000);
}
