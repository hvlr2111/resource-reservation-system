"use client";

import { format } from "date-fns";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function LocalDateTime({ value }: { value: string | Date }) {
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const date = new Date(value);

  return (
    <time dateTime={date.toISOString()} suppressHydrationWarning>
      {mounted ? format(date, "PPpp") : date.toISOString()}
    </time>
  );
}
