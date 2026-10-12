# Resource Reservation Management System

A full-stack web application that helps an organization manage its shared facilities and resources, and coordinate reservations in one central place.

## Problem

Reservations were handled through informal communication and manual records, which led to scheduling confusion, overlapping bookings, and uncertainty about what was available. This system replaces that with a single source of truth.

## Solution

- **Admins** manage resources (rooms, equipment, vehicles, etc.) and see reservations and usage across the organization.
- **Members** browse resources, check availability on a timeline, and make or cancel their own reservations.
- **Double bookings are impossible.** Overlaps are rejected by a PostgreSQL exclusion constraint, so the rule holds even when two users book at the same moment.

## Key Features

- Email/password authentication with role-based access (Admin / Member), enforced on the server
- Resource management with categories, capacity, location, and active/inactive status
- Resource browsing with search and category filter
- Reservation creation with validation (no past bookings, duration limits, end after start)
- Availability timeline per resource and day
- "My Reservations" page with cancellation
- Admin overview of all reservations with filters, pagination, and cancellation
- Weekly usage summary (bookings and utilization per resource)

## Tech Stack

| Area | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| UI | Tailwind CSS, shadcn/ui |
| Validation | Zod |
| Authentication | bcryptjs + JWT (`jose`) in an httpOnly cookie |
| Dates | `Intl.DateTimeFormat` with the Asia/Colombo time zone |
| Local database | Docker Compose |
| Version control | Git and GitHub |

## Getting Started

### Prerequisites

- Node.js 20 or newer
- Docker Desktop (running)
- Git

### Setup

1. Clone the repository and install dependencies:

```bash
   git clone <your-repo-url>
   cd <repo-folder>
   npm install
```

2. Create your environment file:

```bash
   # macOS / Linux
   cp .env.example .env

   # Windows (PowerShell)
   copy .env.example .env
```

   Then open `.env` and set `AUTH_SECRET` to a random string. You can generate one with:

```bash
   node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"
```

3. Start PostgreSQL:

```bash
   docker compose up -d
```

4. Apply the database migrations and generate the Prisma client:

```bash
   npx prisma migrate deploy
   npx prisma generate
```

5. Seed demo data:

```bash
   npx prisma db seed
```

6. Start the development server:

```bash
   npm run dev
```

   Open http://localhost:3000

### Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@example.com | Password123! |
| Member | member@example.com | Password123! |

### Useful Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npx prisma studio` | Browse the database in the browser |
| `npx prisma migrate reset` | Reset the database and re-run all migrations |
| `docker compose down` | Stop the database (add `-v` to delete its data) |

## How It Works

### Roles

- **Member:** browse resources, book, view and cancel their own reservations.
- **Admin:** everything a member can do, plus managing resources and categories, viewing all reservations, cancelling any reservation, and viewing usage statistics.

New registrations are always Members. The admin account is created by the seed script.

### Project Structure

```
prisma/
  schema.prisma          Data model
  migrations/            SQL migrations (includes overlap constraint)
  seed.ts                Demo data
src/
  app/                   Pages and routes (App Router)
  app/actions/           Server actions (auth, resources, reservations)
  components/            UI components
  lib/                   Prisma client, authentication helpers
docker-compose.yml       Local PostgreSQL
```

## Database Design

Four tables:

- **User**: name, unique email, password hash, role (ADMIN or MEMBER)
- **ResourceCategory**: unique name
- **Resource**: belongs to a category; has name, description, location, capacity, and an active flag
- **Reservation**: belongs to a resource and a user; has title, start and end time, status (CONFIRMED or CANCELLED), and cancellation time


ER diagram:https://dbdiagram.io/d/resource-reservation-system-6accbe6310dbb6efb5d32669

## Key Engineering Decisions

- **Overlap protection in the database.** A `btree_gist` exclusion constraint on `tstzrange("startTime", "endTime", '[)')` rejects overlapping CONFIRMED reservations for the same resource. An application-only check can fail when two requests arrive at the same moment; the constraint cannot. The application also performs a friendly pre-check and translates the database error (code `23P01`) into a clear message. The half-open range `[)` means back-to-back bookings (one ending when the next begins) are allowed.
- **A check constraint** (`end_after_start`) guarantees valid time ranges at the database level.
- **UTC storage.** All timestamps are stored as `timestamptz` and displayed in Sri Lanka time.
- **Soft cancellation and deactivation.** Reservations are marked CANCELLED and resources are deactivated rather than deleted, which preserves history for reporting and avoids broken references.
- **Server-side authorization.** Every server action verifies the current user and role itself; route protection alone is never relied on.
- **Fresh user lookup on each request.** The JWT stores only the user id, and the user is re-loaded from the database each time, so role changes or removed users take effect immediately.
- **Simple custom authentication** instead of a heavy auth library, to keep the code small and easy to understand.

## Architecture

A page reads the request and loads only the data it needs from Prisma. A form submits to a Server Action, which checks the session and authorization, validates input with Zod, applies the pure booking rules in `src/lib/booking-rules.ts`, and then reads or writes PostgreSQL. Server Actions keep mutations close to the UI while still running trusted authorization and validation on the server; the browser never supplies the acting user id.

The rules in `src/lib/booking-rules.ts` are a pure function so both behavior and edge cases can be checked without database or server-time-zone dependencies. Application checks provide timely, friendly validation, while PostgreSQL constraints remain the final authority for invariants that must hold under concurrent requests. In particular, the exclusion constraint rejects overlapping confirmed reservations even if simultaneous requests both pass the application's overlap pre-check.

Run `npx tsx scripts/concurrency-test.ts` to demonstrate the database overlap protection with simultaneous reservation attempts.

## Business Context and Rules

The seed data models a fictional Colombo software company working from one five-storey building: client and event spaces on Floor 1, engineering teams (focus pods, huddle and war rooms) on Floor 2, product and design on Floor 3, labs and devices (GPU workstation, test devices, recording studio) on Floor 4, and the executive floor on Floor 5, plus two pool vehicles. Rooms are named after computing pioneers.

Booking rules:
- Bookable Monday to Friday, 08:00-20:00 Sri Lanka time, in 15-minute steps.
- Minimum 30 minutes; each resource has its own maximum duration (for example 2 hours for huddle rooms, 8 hours for the training hall).
- Bookings can be made up to 30 days ahead and cannot start in the past.
- Back-to-back bookings are allowed.
- A member may hold at most 5 upcoming reservations (admins are exempt) to prevent hoarding of shared labs and rooms.
- Only the reservation owner or an admin can cancel it; cancelled reservations are kept for history.
- Utilization = booked hours / available hours (12 hours x 5 working days per week).

## Possible Future Improvements

- Recurring reservations
- Email or in-app notifications
- Approval workflow for sensitive resources
- Full calendar view with drag-and-drop
- Per-resource opening hours and booking rules
- Automated end-to-end tests and deployment

## Demo Video

[add your video link here]