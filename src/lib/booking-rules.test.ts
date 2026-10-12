import { describe, expect, it } from "vitest";
import { validateReservationTimes } from "./booking-rules";

const now = new Date("2026-10-12T00:00:00.000Z");
const maxDurationHours = 4;

function validateLocalTimes(start: string, end: string) {
  return validateReservationTimes({
    start: new Date(start),
    end: new Date(end),
    now,
    maxDurationHours,
  });
}

describe("validateReservationTimes", () => {
  it("accepts a valid booking", () => {
    expect(
      validateLocalTimes("2026-10-12T02:30:00.000Z", "2026-10-12T03:00:00.000Z"),
    ).toBeNull();
  });

  it("rejects a start time in the past", () => {
    expect(
      validateLocalTimes("2026-10-09T02:30:00.000Z", "2026-10-09T03:00:00.000Z"),
    ).toBe("Start time cannot be in the past.");
  });

  it("rejects an end time before the start time", () => {
    expect(
      validateLocalTimes("2026-10-12T03:00:00.000Z", "2026-10-12T02:30:00.000Z"),
    ).toBe("End time must be after start time.");
  });

  it("rejects times that are not on a 15-minute boundary", () => {
    expect(
      validateLocalTimes("2026-10-12T02:37:00.000Z", "2026-10-12T03:00:00.000Z"),
    ).toBe("Start and end times must be on 15-minute boundaries.");
  });

  it("rejects bookings shorter than 30 minutes", () => {
    expect(
      validateLocalTimes("2026-10-12T02:30:00.000Z", "2026-10-12T02:45:00.000Z"),
    ).toBe("Reservations must be at least 30 minutes long.");
  });

  it("rejects bookings longer than the resource maximum", () => {
    expect(
      validateLocalTimes("2026-10-12T02:30:00.000Z", "2026-10-12T06:45:00.000Z"),
    ).toBe("Reservations cannot be longer than 4 hours.");
  });

  it("rejects bookings before 08:00 Colombo time", () => {
    expect(
      validateLocalTimes("2026-10-12T02:15:00.000Z", "2026-10-12T02:45:00.000Z"),
    ).toBe(
      "Reservations must be within 08:00-20:00 Colombo time.",
    );
  });

  it("rejects bookings ending after 20:00 Colombo time", () => {
    expect(
      validateLocalTimes("2026-10-12T14:15:00.000Z", "2026-10-12T14:45:00.000Z"),
    ).toBe(
      "Reservations must be within 08:00-20:00 Colombo time.",
    );
  });

  it("rejects bookings on weekends", () => {
    expect(
      validateLocalTimes("2026-10-17T02:30:00.000Z", "2026-10-17T03:00:00.000Z"),
    ).toBe("Reservations are only available Monday through Friday.");
  });

  it("rejects bookings more than 30 days ahead", () => {
    expect(
      validateLocalTimes("2026-11-12T02:30:00.000Z", "2026-11-12T03:00:00.000Z"),
    ).toBe("Reservations can only be made up to 30 days in advance.");
  });

  it("accepts back-to-back bookings", () => {
    const first = validateLocalTimes(
      "2026-10-12T02:30:00.000Z",
      "2026-10-12T03:00:00.000Z",
    );
    const next = validateLocalTimes(
      "2026-10-12T03:00:00.000Z",
      "2026-10-12T03:30:00.000Z",
    );

    expect(first).toBeNull();
    expect(next).toBeNull();
  });
});
