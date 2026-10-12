import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResourceFilters } from "./resource-filters";
import { PageLoading } from "@/components/page-loading";

export default function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ResourcesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ResourcesContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();

  const [rawSearchParams, categories] = await Promise.all([
    searchParams,
    prisma.resourceCategory.findMany({ orderBy: { name: "asc" } }),
  ]);
  const search = typeof rawSearchParams.search === "string"
    ? rawSearchParams.search
    : "";
  const requestedCategory = typeof rawSearchParams.category === "string"
    ? rawSearchParams.category
    : "";
  const resolvedSearchParams = {
    search,
    category: categories.some((category) => category.id === requestedCategory)
      ? requestedCategory
      : "",
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Resources</h1>
        <p className="mt-2 text-muted-foreground">
          Browse and book available resources.
        </p>
      </div>

      <Suspense fallback={<p className="py-8 text-center text-muted-foreground">Loading resources...</p>}>
        <ResourceList
          categories={categories}
          searchParams={resolvedSearchParams}
        />
      </Suspense>
    </main>
  );
}

async function ResourceList({
  categories,
  searchParams,
}: {
  categories: { id: string; name: string }[];
  searchParams: { search?: string; category?: string };
}) {
  // Build where clause based on filters
  const where: {
    isActive: boolean;
    name?: { contains: string; mode: "insensitive" };
    categoryId?: string;
  } = {
    isActive: true,
  };

  if (searchParams.search) {
    where.name = {
      contains: searchParams.search,
      mode: "insensitive",
    };
  }

  if (searchParams.category && searchParams.category !== "all") {
    where.categoryId = searchParams.category;
  }

  const resources = await prisma.resource.findMany({
    where,
    include: {
      category: true,
    },
    orderBy: { name: "asc" },
  });

  if (resources.length === 0) {
    return (
      <div className="space-y-4">
        <ResourceFilters categories={categories} searchParams={searchParams} />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg text-muted-foreground">No resources found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Try adjusting your search or filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResourceFilters categories={categories} searchParams={searchParams} />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.map((resource) => (
              <TableRow key={resource.id}>
                <TableCell className="font-medium">{resource.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{resource.category.name}</Badge>
                </TableCell>
                <TableCell>{resource.location || "-"}</TableCell>
                <TableCell>{resource.capacity ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/resources/${resource.id}`} />}
                  >
                    Book
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
