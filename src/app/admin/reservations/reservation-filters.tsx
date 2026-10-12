"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ReservationFilters({
  resources,
  filters,
}: {
  resources: { id: string; name: string }[];
  filters: { resource: string; status: string; from: string; to: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function applyFilters(formData: FormData) {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ["resource", "status", "from", "to"]) {
      const value = formData.get(key);
      if (typeof value === "string" && value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete("page");
    const query = params.toString();
    router.push(`/admin/reservations${query ? `?${query}` : ""}`, {
      scroll: false,
    });
  }

  return (
    <form
      action={applyFilters}
      className="grid gap-3 rounded-md border p-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]"
    >
      <label className="space-y-1 text-sm">
        <span>Resource</span>
        <select
          name="resource"
          defaultValue={filters.resource}
          className="h-9 w-full rounded-md border bg-background px-3"
        >
          <option value="">All resources</option>
          {resources.map((resource) => (
            <option key={resource.id} value={resource.id}>
              {resource.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span>Status</span>
        <select
          name="status"
          defaultValue={filters.status}
          className="h-9 w-full rounded-md border bg-background px-3"
        >
          <option value="">All statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span>From</span>
        <input
          type="date"
          name="from"
          defaultValue={filters.from}
          className="h-9 w-full rounded-md border bg-background px-3"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span>To</span>
        <input
          type="date"
          name="to"
          defaultValue={filters.to}
          className="h-9 w-full rounded-md border bg-background px-3"
        />
      </label>
      <Button type="submit" className="self-end">
        Apply filters
      </Button>
    </form>
  );
}
