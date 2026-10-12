import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResourceDialog } from "./resource-dialog";
import { CategoryDialog } from "./category-dialog";
import { ToggleResourceButton } from "./toggle-resource-button";

export default function AdminResourcesPage() {
  return (
    <Suspense>
      <AdminResourcesContent />
    </Suspense>
  );
}

async function AdminResourcesContent() {
  const [resources, categories] = await Promise.all([
    prisma.resource.findMany({
      include: {
        category: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.resourceCategory.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Manage Resources</h1>
          <p className="mt-2 text-muted-foreground">
            Add, edit, and manage resources and categories.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CategoryDialog />
          <ResourceDialog categories={categories} />
        </div>
      </div>

      {resources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg text-muted-foreground">No resources found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first resource to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
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
                  <TableCell>
                    <Badge variant={resource.isActive ? "default" : "secondary"}>
                      {resource.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <ResourceDialog
                        categories={categories}
                        resource={resource}
                      />
                      <ToggleResourceButton resource={resource} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
