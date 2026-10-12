import { formatColomboDateTime } from "@/lib/dates";

export function LocalDateTime({ value }: { value: string | Date }) {
  const date = new Date(value);

  return (
    <time dateTime={date.toISOString()}>
      {formatColomboDateTime(date)}
    </time>
  );
}
