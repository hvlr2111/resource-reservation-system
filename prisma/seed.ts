import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SL_OFFSET_MS = 5.5 * 60 * 60 * 1000; // Sri Lanka is UTC+05:30

// Moves a day offset to the nearest working day (Mon-Fri) in Sri Lanka time.
function weekdayOffset(target: number): number {
  const nowSL = new Date(Date.now() + SL_OFFSET_MS);
  const y = nowSL.getUTCFullYear();
  const m = nowSL.getUTCMonth();
  const d = nowSL.getUTCDate();
  const step = target >= 0 ? 1 : -1;
  let offset = target;
  for (;;) {
    const dow = new Date(Date.UTC(y, m, d + offset)).getUTCDay();
    if (dow !== 0 && dow !== 6) return offset;
    offset += step;
  }
}

// Builds a UTC Date for "N days from today at HH:MM Sri Lanka time".
function slTime(daysFromToday: number, hour: number, minute = 0): Date {
  const nowSL = new Date(Date.now() + SL_OFFSET_MS);
  return new Date(
    Date.UTC(
      nowSL.getUTCFullYear(),
      nowSL.getUTCMonth(),
      nowSL.getUTCDate() + weekdayOffset(daysFromToday),
      hour - 5,
      minute - 30
    )
  );
}

const users = [
  { name: "Admin User", email: "admin@example.com", role: "ADMIN" as const },
  { name: "Member User", email: "member@example.com", role: "MEMBER" as const },
  { name: "Nimali Perera", email: "nimali.perera@example.com", role: "MEMBER" as const },
  { name: "Kasun Fernando", email: "kasun.fernando@example.com", role: "MEMBER" as const },
  { name: "Ishara Jayawardena", email: "ishara.jayawardena@example.com", role: "MEMBER" as const },
  { name: "Tharindu Silva", email: "tharindu.silva@example.com", role: "MEMBER" as const },
  { name: "Dilani Wickramasinghe", email: "dilani.wickramasinghe@example.com", role: "MEMBER" as const },
];

// A fictional Colombo software company working from one five-storey building.
// Floor 1: reception, client and event spaces | Floor 2: engineering teams
// Floor 3: product and design | Floor 4: labs and devices | Floor 5: executive floor
const catalogue = [
  {
    category: "Meeting Rooms",
    items: [
      { name: "Lovelace Boardroom", location: "Floor 5", capacity: 14, maxDurationHours: 4, description: "Executive boardroom with a large display, video conferencing and a whiteboard wall." },
      { name: "Turing Conference Room", location: "Floor 3", capacity: 10, maxDurationHours: 4, description: "Conference room with projector and conference phone for architecture reviews and planning sessions." },
      { name: "Hopper Huddle Room", location: "Floor 2", capacity: 4, maxDurationHours: 2, description: "Small room for stand-ups, quick syncs and calls." },
      { name: "Babbage Interview Room", location: "Floor 1", capacity: 3, maxDurationHours: 2, description: "Quiet room near reception for candidate interviews and one-to-one meetings." },
      { name: "Berners-Lee Client Lounge", location: "Floor 1", capacity: 8, maxDurationHours: 3, description: "Client-facing meeting room with a display for demos and requirement workshops." },
    ],
  },
  {
    category: "Workspaces",
    items: [
      { name: "Hamilton War Room", location: "Floor 2", capacity: 10, maxDurationHours: 8, description: "Dedicated project room with wall-to-wall whiteboards for release crunches and incident response." },
      { name: "Design Studio", location: "Floor 3", capacity: 6, maxDurationHours: 4, description: "Collaborative studio for UX workshops, wireframing and design sprints." },
      { name: "Focus Pod A", location: "Floor 2", capacity: 1, maxDurationHours: 4, description: "Soundproof single-person pod for deep work and focused coding." },
      { name: "Focus Pod B", location: "Floor 2", capacity: 1, maxDurationHours: 4, description: "Soundproof single-person pod for deep work and remote calls." },
    ],
  },
  {
    category: "Event & Training Spaces",
    items: [
      { name: "Knuth Training Hall", location: "Floor 1", capacity: 40, maxDurationHours: 8, description: "Classroom-style hall for onboarding, workshops, training and tech talks." },
      { name: "Innovation Lounge", location: "Floor 5", capacity: 25, maxDurationHours: 4, description: "Open lounge for hackathons, team events and town halls." },
    ],
  },
  {
    category: "Labs & Devices",
    items: [
      { name: "Device Test Lab", location: "Floor 4", capacity: 4, maxDurationHours: 4, description: "Testing bench with network access for QA and device compatibility testing." },
      { name: "GPU Workstation", location: "Floor 4", capacity: 1, maxDurationHours: 8, description: "High-performance GPU machine for model training and heavy builds." },
      { name: "Mobile Test Device Kit", location: "Floor 2", capacity: null, maxDurationHours: 8, description: "Set of Android and iOS test phones and tablets for app testing." },
      { name: "Laptop Pool (Dell Latitude)", location: "Floor 2", capacity: null, maxDurationHours: 8, description: "Loan laptops for training sessions, interns and client site work." },
      { name: "Recording Studio", location: "Floor 4", capacity: 4, maxDurationHours: 4, description: "Sound-treated room for tech talk recordings, webinars and product videos." },
      { name: "Portable Projector", location: "Floor 2", capacity: null, maxDurationHours: 4, description: "Projector with screen and HDMI adapters for workshops and off-floor meetings." },
    ],
  },
  {
    category: "Vehicles",
    items: [
      { name: "Toyota KDH Van", location: "Basement Parking", capacity: 9, maxDurationHours: 12, description: "9-seater van for team outings, event transport and equipment moves." },
      { name: "Toyota Axio Sedan", location: "Basement Parking", capacity: 4, maxDurationHours: 12, description: "Company sedan for client visits and airport pickups." },
    ],
  },
];

// [resource, user email, title, day offset, start hour, end hour] (Sri Lanka time, weekdays only)
const sampleReservations: [string, string, string, number, number, number][] = [
  ["Turing Conference Room", "ishara.jayawardena@example.com", "Sprint Retrospective - Payments Team", -3, 9, 11],
  ["Knuth Training Hall", "dilani.wickramasinghe@example.com", "Git Workflow Training", -4, 10, 13],
  ["Turing Conference Room", "nimali.perera@example.com", "Sprint Planning - Mobile Team", 1, 9, 11],
  ["Turing Conference Room", "kasun.fernando@example.com", "Architecture Review - Booking Service", 1, 14, 16],
  ["Lovelace Boardroom", "admin@example.com", "Quarterly Business Review", 2, 10, 12],
  ["Berners-Lee Client Lounge", "kasun.fernando@example.com", "Client Demo - UAT Walkthrough", 1, 11, 13],
  ["Babbage Interview Room", "admin@example.com", "Candidate Interviews - Backend Engineer", 1, 9, 11],
  ["Babbage Interview Room", "admin@example.com", "Candidate Interviews - QA Engineer", 1, 14, 16],
  ["Hopper Huddle Room", "tharindu.silva@example.com", "Daily Stand-up", 1, 9, 10],
  ["Hamilton War Room", "ishara.jayawardena@example.com", "Release Candidate Crunch", 2, 9, 17],
  ["Design Studio", "dilani.wickramasinghe@example.com", "UX Workshop - Onboarding Flow", 2, 10, 13],
  ["Knuth Training Hall", "admin@example.com", "New Joiner Onboarding", 2, 9, 17],
  ["GPU Workstation", "tharindu.silva@example.com", "Recommendation Model Training Run", 1, 9, 17],
  ["Mobile Test Device Kit", "nimali.perera@example.com", "Mobile App Regression Testing", 2, 9, 17],
  ["Recording Studio", "member@example.com", "Tech Talk: Intro to Kubernetes", 3, 14, 16],
  ["Innovation Lounge", "admin@example.com", "Quarterly Hackathon Kickoff", 3, 13, 16],
  ["Toyota KDH Van", "kasun.fernando@example.com", "Team Outing Transport", 3, 8, 18],
  ["Toyota Axio Sedan", "admin@example.com", "Client Visit and Airport Pickup", 2, 8, 15],
];

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  for (const u of users) {
    await prisma.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, passwordHash } });
  }

  for (const group of catalogue) {
    const category = await prisma.resourceCategory.upsert({
      where: { name: group.category },
      update: {},
      create: { name: group.category },
    });
    for (const item of group.items) {
      const exists = await prisma.resource.findFirst({ where: { name: item.name } });
      if (!exists) {
        await prisma.resource.create({ data: { ...item, categoryId: category.id } });
      }
    }
  }

  // Sample reservations are only added to an empty reservation table.
  if ((await prisma.reservation.count()) === 0) {
    for (const [resourceName, email, title, day, startHour, endHour] of sampleReservations) {
      const resource = await prisma.resource.findFirst({ where: { name: resourceName } });
      const user = await prisma.user.findUnique({ where: { email } });
      if (!resource || !user) continue;
      try {
        await prisma.reservation.create({
          data: {
            resourceId: resource.id,
            userId: user.id,
            title,
            startTime: slTime(day, startHour),
            endTime: slTime(day, endHour),
          },
        });
      } catch {
        // Skip a sample entry if it would overlap another (the database constraint rejects it).
        console.warn(`Skipped overlapping sample reservation: ${title}`);
      }
    }
  }

  console.log("Seed complete");
}

main().finally(() => prisma.$disconnect());