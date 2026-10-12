import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  addDaysToDateString,
  colomboDateTimeLocalToUtc,
  colomboMidnight,
  getColomboDate,
} from "../src/lib/dates";
import { prisma } from "../src/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const TEST_COUNT = 10;

async function main() {
  const titlePrefix = `Concurrency test ${randomUUID()}`;

  try {
    const [resource, member] = await Promise.all([
      prisma.resource.findFirst({
        where: { name: "Lovelace Boardroom" },
        select: { id: true },
      }),
      prisma.user.findFirst({
        where: { role: "MEMBER" },
        select: { id: true },
      }),
    ]);

    if (!resource) throw new Error('Resource "Lovelace Boardroom" was not found.');
    if (!member) throw new Error("No MEMBER user was found.");

    const firstDate = getColomboDate(new Date(Date.now() + 40 * DAY_MS));
    const windowStart = colomboMidnight(firstDate);
    const windowEnd = colomboMidnight(addDaysToDateString(firstDate, 8));
    const existingReservations = await prisma.reservation.findMany({
      where: {
        resourceId: resource.id,
        status: "CONFIRMED",
        startTime: { lt: windowEnd },
        endTime: { gt: windowStart },
      },
      select: { startTime: true, endTime: true },
    });
    let slot: { startTime: Date; endTime: Date } | undefined;

    for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
      const date = addDaysToDateString(firstDate, dayOffset);
      const [year, month, day] = date.split("-").map(Number);
      const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      if (weekday === 0 || weekday === 6) continue;

      const startTime = new Date(
        colomboDateTimeLocalToUtc(`${date}T10:00`),
      );
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      const isTaken = existingReservations.some(
        (reservation) =>
          startTime < reservation.endTime && endTime > reservation.startTime,
      );
      if (!isTaken) {
        slot = { startTime, endTime };
        break;
      }
    }

    if (!slot) throw new Error("No free one-hour test slot found about 40 days ahead.");
    const results = await Promise.allSettled(
      Array.from({ length: TEST_COUNT }, (_, index) =>
        prisma.reservation.create({
          data: {
            resourceId: resource.id,
            userId: member.id,
            title: `${titlePrefix} ${index + 1}`,
            startTime: slot.startTime,
            endTime: slot.endTime,
          },
          select: { id: true },
        }),
      ),
    );
    const succeeded = results.filter((result) => result.status === "fulfilled").length;
    const rejected = results.length - succeeded;

    process.stdout.write(
      `Concurrent reservation attempts: ${succeeded} succeeded, ${rejected} rejected (expected 1 and 9).\n`,
    );
  } finally {
    try {
      await prisma.reservation.deleteMany({
        where: { title: { startsWith: titlePrefix } },
      });
    } finally {
      await prisma.$disconnect();
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected test error.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
