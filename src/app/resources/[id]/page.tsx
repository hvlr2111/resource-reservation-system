import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocalDateTime } from "@/components/local-date-time";
import { BookingForm } from "./booking-form";

export default function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-5xl flex-1 p-6" />}>
      <ResourceDetailContent params={params} />
    </Suspense>
  );
}

async function ResourceDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: resourceId } = await params;
  const user = await requireUser();

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: {
      category: true,
    },
  });

  // Return 404 if resource doesn't exist
  if (!resource) {
    notFound();
  }

  // Return 404 for inactive resources unless viewer is admin
  if (!resource.isActive && user.role !== "ADMIN") {
    notFound();
  }

  const upcomingReservations = await prisma.reservation.findMany({
    where: {
      resourceId,
      status: "CONFIRMED",
      endTime: { gt: new Date() },
    },
    include: { user: { select: { name: true } } },
    orderBy: { startTime: "asc" },
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href="/resources" />}
          className="mb-4"
        >
          ← Back to resources
        </Button>
        <h1 className="text-2xl font-semibold">{resource.name}</h1>
        <Badge variant="secondary" className="mt-2">
          {resource.category.name}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resource Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Description</h3>
                <p className="mt-1 text-muted-foreground">
                  {resource.description || "No description provided."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold">Location</h3>
                  <p className="mt-1 text-muted-foreground">
                    {resource.location || "Not specified"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Capacity</h3>
                  <p className="mt-1 text-muted-foreground">
                    {resource.capacity
                      ? `${resource.capacity} people`
                      : "Not specified"}
                  </p>
                </div>
              </div>

              {!resource.isActive && user.role === "ADMIN" && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
                  <p className="text-sm text-yellow-800">
                    This resource is currently inactive and not visible to
                    regular users.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming reservations</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingReservations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No upcoming reservations. This resource is available to book.
                </p>
              ) : (
                <ul className="divide-y">
                  {upcomingReservations.map((reservation) => (
                    <li key={reservation.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                      <p className="font-medium">{reservation.title}</p>
                      <p className="text-sm text-muted-foreground">
                        <LocalDateTime value={reservation.startTime} />
                        {" – "}
                        <LocalDateTime value={reservation.endTime} />
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Booked by {reservation.user.name}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Book this resource</CardTitle>
          </CardHeader>
          <CardContent>
            {resource.isActive ? (
              <BookingForm resourceId={resource.id} />
            ) : (
              <p className="text-sm text-muted-foreground">
                This resource is inactive and cannot be booked.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
