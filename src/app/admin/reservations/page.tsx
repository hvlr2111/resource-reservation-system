import { Suspense } from "react";
import { ReservationStatus, type Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LocalDateTime } from "@/components/local-date-time";
import { ReservationFilters } from "./reservation-filters";
import { ReservationPagination } from "./reservation-pagination";
import { CancelReservationButton } from "@/app/reservations/cancel-reservation-button";
import { PageLoading } from "@/components/page-loading";
import {
  addDaysToDateString,
  colomboMidnight,
  getColomboDate,
  isValidDateString,
} from "@/lib/dates";
import { CLOSE_HOUR, OPEN_HOUR } from "@/lib/booking-rules";

const PAGE_SIZE = 10;
const RESOURCE_LIST_LIMIT = 1000;

type QueryValues = Record<string, string | string[] | undefined>;

export default function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<QueryValues>;
}) {
  return (
    <Suspense fallback={<PageLoading />}>
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
      take: RESOURCE_LIST_LIMIT,
    }),
    prisma.resource.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: RESOURCE_LIST_LIMIT,
    }),
    currentSriLankaWeek(),
  ]);

  const fromDate = typeof query.from === "string" && isValidDateString(query.from)
    ? query.from
    : "";
  const toDate = typeof query.to === "string" && isValidDateString(query.to)
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
    ...(fromDate ? { gte: colomboMidnight(fromDate) } : {}),
    ...(toDate ? { lt: colomboMidnight(addDaysToDateString(toDate, 1)) } : {}),
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
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      status: true,
      resource: { select: { name: true } },
      user: { select: { name: true } },
    },
    orderBy: { startTime: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  // Utilization is weekday booked time clipped to 08:00-20:00, divided by 12 * 5 available hours.
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
      utilization: Math.min(100, (bookedHours / (12 * 5)) * 100),
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
          key={`${resourceId}:${filterStatus}:${fromDate}:${toDate}`}
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
          <div className="overflow-x-auto rounded-md border">
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

async function currentSriLankaWeek() {
  const today = getColomboDate();
  const [year, month, day] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const startDate = addDaysToDateString(today, -((weekday + 6) % 7));
  const start = colomboMidnight(startDate);
  return { start, end: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000) };
}

function sriLankaBusinessHoursOverlap(
  reservationStart: Date,
  reservationEnd: Date,
  weekStart: Date,
) {
  let milliseconds = 0;
  for (let day = 0; day < 5; day++) {
    const businessStart = new Date(
      weekStart.getTime() +
        day * 24 * 60 * 60 * 1000 +
        OPEN_HOUR * 60 * 60 * 1000,
    );
    const businessEnd = new Date(
      businessStart.getTime() + (CLOSE_HOUR - OPEN_HOUR) * 60 * 60 * 1000,
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
