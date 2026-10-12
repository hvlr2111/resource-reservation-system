import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ReservationPagination({
  page,
  pageCount,
  filters,
}: {
  page: number;
  pageCount: number;
  filters: { resource: string; status: string; from: string; to: string };
}) {
  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (filters.resource) params.set("resource", filters.resource);
    if (filters.status) params.set("status", filters.status);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    params.set("page", String(targetPage));
    return `/admin/reservations?${params.toString()}`;
  }

  return (
    <nav
      aria-label="Reservation pages"
      className="flex items-center justify-between"
    >
      <Button
        variant="outline"
        disabled={page <= 1}
        render={page > 1 ? <Link href={pageHref(page - 1)} /> : undefined}
        nativeButton={page <= 1}
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {pageCount}
      </span>
      <Button
        variant="outline"
        disabled={page >= pageCount}
        render={page < pageCount ? <Link href={pageHref(page + 1)} /> : undefined}
        nativeButton={page >= pageCount}
      >
        Next
      </Button>
    </nav>
  );
}
