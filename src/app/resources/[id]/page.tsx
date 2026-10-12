import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
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

      <Card>
        <CardHeader>
          <CardTitle>Resource Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Description</h3>
            <p className="text-muted-foreground mt-1">
              {resource.description || "No description provided."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="font-semibold text-sm">Location</h3>
              <p className="text-muted-foreground mt-1">
                {resource.location || "Not specified"}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Capacity</h3>
              <p className="text-muted-foreground mt-1">
                {resource.capacity ? `${resource.capacity} people` : "Not specified"}
              </p>
            </div>
          </div>

          {!resource.isActive && user.role === "ADMIN" && (
            <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                This resource is currently inactive and not visible to regular users.
              </p>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Booking functionality coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
