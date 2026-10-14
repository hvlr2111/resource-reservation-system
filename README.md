# Resource Reservation Management System

A Next.js application for a software company in one five-storey Colombo building, where rooms, labs, devices, and vehicles were booked through informal communication. It gives employees and administrators a shared view of resources and reservations, reducing booking overlaps and uncertainty about availability.

## Solution overview

- **Admins** create and edit resources and categories, activate or deactivate resources, review and cancel reservations, and view weekly booking and utilization summaries.
- **Members** browse active resources, check availability, make reservations, and view or cancel their own eligible reservations.
- New self-registered accounts are Members. The seed script creates the demo Admin account.

## Key features

- Email/password registration and login with role-based access.
- Active resource browsing with name search and category filtering.
- Admin resource and category management, including resource category filtering.
- Per-resource availability timeline and upcoming confirmed reservations.
- Reservation forms with Colombo time input and server-side booking validation.
- My Reservations view with upcoming and past/cancelled sections.
- Admin reservations view with resource, status, and date filters, 10-row pagination, cancellation, and weekly usage summaries.
- Friendly empty, not-found, loading, and error UI.

## Tech stack

Versions below are the dependency versions/ranges declared in `package.json`; the PostgreSQL image version is declared in `docker-compose.yml`.

| Area | Technology |
|---|---|
| Framework | Next.js `16.4.0` (App Router) |
| Language | TypeScript `^5` |
| Database | PostgreSQL `16` |
| ORM | Prisma `^6.19.3` / Prisma Client `^6.19.3` |
| UI | React `19.3.0`, Tailwind CSS `^4`, shadcn CLI `^4.21.4`, Base UI `^1.9.0` |
| Validation | Zod `^4.6.5` |
| Authentication | `jose` `^6.2.12` for JWT and `bcryptjs` `^3.0.3` for password hashing |
| Dates | Built-in `Intl.DateTimeFormat` with the `Asia/Colombo` time zone |
| Docker | Docker Compose running the `postgres:16` image |
| Unit tests | Vitest `^4.1.11` |

## Getting started

### Prerequisites

- Node.js and npm
- Docker with Docker Compose
- Git

### Setup

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/hvlr2111/resource-reservation-system.git
   cd resource-reservation-system
   npm install
   ```

2. Copy `.env.example` to `.env`:

   macOS/Linux:

   ```bash
   cp .env.example .env
   ```

   Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   `.env.example` defines `DATABASE_URL` and `AUTH_SECRET`. The compose database uses PostgreSQL on port `5432`, database `reservations`, user `app`, and password `app`. Replace the example `AUTH_SECRET` with a random value of at least 32 characters. For example:

   ```bash
   node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

3. Start the local database:

   ```bash
   docker compose up -d
   ```

4. Apply the committed Prisma migrations and generate the Prisma Client:

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

5. Seed demo users, categories, resources, and sample reservations:

   ```bash
   npx prisma db seed
   ```

   Sample reservations are added only when the reservation table is empty. The seed script hashes the shared demo password and upserts the seeded users and categories.

6. Start the development server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

### Demo accounts

All seeded accounts share the password `Password123!`.

| Role | Name | Email |
|---|---|---|
| Admin | Admin User | `admin@example.com` |
| Member | Member User | `member@example.com` |
| Member | Nimali Perera | `nimali.perera@example.com` |
| Member | Kasun Fernando | `kasun.fernando@example.com` |
| Member | Ishara Jayawardena | `ishara.jayawardena@example.com` |
| Member | Tharindu Silva | `tharindu.silva@example.com` |
| Member | Dilani Wickramasinghe | `dilani.wickramasinghe@example.com` |

## Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest unit tests |
| `npx prisma migrate deploy` | Apply pending committed migrations |
| `npx prisma generate` | Generate Prisma Client |
| `npx prisma db seed` | Run the seed configured in `package.json` |
| `npx prisma studio` | Open Prisma Studio |
| `npx tsx scripts/concurrency-test.ts` | Run simultaneous inserts to demonstrate the overlap constraint |
| `docker compose up -d` | Start the local PostgreSQL service |
| `docker compose down` | Stop the local PostgreSQL service |

## How it works

### Roles and permissions

- **Member:** browse resources, check availability, create reservations, view their own reservation history, and cancel their own future confirmed reservations.
- **Admin:** all Member capabilities, plus manage resources and categories, view and cancel reservations for all users, and view weekly usage summaries.

Registration always assigns the `MEMBER` role. Admin routes are guarded by the admin layout, and the mutations themselves also perform server-side authorization.

### Project structure

```text
prisma/
  migrations/
    20261011162411_init/
    20261012103719_add_max_duration_hours/
  schema.prisma
  seed.ts
scripts/
  concurrency-test.ts
src/
  app/
    actions/                 Authentication, resource, and reservation actions
    admin/
      reservations/          Admin reservation overview and filters
      resources/             Admin resource and category management
    login/
    register/
    reservations/             Current user's reservations
    resources/
      [id]/                   Resource details, booking form, availability timeline
  components/                 Shared layout and UI components
  lib/
    action-state.ts
    auth.ts
    booking-rules.ts
    dates.ts
    prisma-errors.ts
    prisma.ts
    validation.ts
```

## Business context and booking rules

The seed catalogue models one fictional five-storey software-company building:

| Location | Seeded layout and examples |
|---|---|
| Floor 1 | Reception, client and event spaces; Babbage Interview Room, Berners-Lee Client Lounge, and Knuth Training Hall |
| Floor 2 | Engineering teams, focus pods, huddle and war rooms; also the Mobile Test Device Kit, Laptop Pool, and Portable Projector |
| Floor 3 | Product and design; Turing Conference Room and Design Studio |
| Floor 4 | Labs and devices; Device Test Lab, GPU Workstation, and Recording Studio |
| Floor 5 | Executive floor; Lovelace Boardroom and Innovation Lounge |
| Basement Parking | Toyota KDH Van and Toyota Axio Sedan |

Reservations are stored as UTC timestamps and interpreted in Sri Lanka time. The server-side rules in `src/lib/booking-rules.ts` and `src/app/actions/reservations.ts` enforce:

- Booking is available Monday through Friday, 08:00 inclusive to 20:00 inclusive for an ending time, in `Asia/Colombo` (UTC+05:30). A start must be before 20:00.
- Start and end must be on 15-minute boundaries and on the same Colombo calendar day.
- A reservation must last at least 30 minutes and no longer than that resource's configured `maxDurationHours`. Admin resource actions accept maximum-duration values from 1 through 12 hours; resources in the seed catalogue have their own configured values.
- A start cannot be in the past or more than 30 days ahead.
- A resource must exist and be active to be booked.
- A Member may have at most 5 confirmed reservations that have not ended. Admins are exempt.
- Confirmed reservations for the same resource may not overlap. Back-to-back reservations are allowed.
- A title is required and may be at most 100 characters.
- Only the reservation owner or an Admin may cancel a reservation. It must still be confirmed and not have ended. Cancellation records a cancelled status and timestamp rather than deleting the reservation.

The admin weekly utilization summary clips confirmed reservation time to weekdays from 08:00 to 20:00 and divides booked time by 12 hours × 5 weekdays for each active resource.

## Database design

The Prisma schema defines four tables:

- **User:** unique email, name, password hash, role (`ADMIN` or `MEMBER`), creation time, and reservations.
- **ResourceCategory:** unique name and related resources.
- **Resource:** category relationship, name, optional description/location/capacity, active status, per-resource maximum duration, creation time, and reservations.
- **Reservation:** resource and user relationships, title, UTC start/end timestamps, status (`CONFIRMED` or `CANCELLED`), creation time, and optional cancellation time.

The initial migration creates the enum types, tables, indexes, and foreign keys. It also enables PostgreSQL's `btree_gist` extension and defines:

- `no_overlapping_reservations`: a GiST exclusion constraint for overlapping half-open `tstzrange(startTime, endTime, '[)')` ranges on the same resource, restricted to `CONFIRMED` rows. The `[)` range permits back-to-back reservations.
- `end_after_start`: a check constraint requiring `endTime > startTime`.

The later migration adds `Resource.maxDurationHours` as a non-null integer with database default `4`.

ER diagram: https://dbdiagram.io/d/resource-reservation-system-6accbe6310dbb6efb5d32669

## Architecture

Pages use server components to check the current user and load page data through the shared Prisma client. Form submissions invoke Server Actions in `src/app/actions/`. Protected actions perform their own required authentication and authorization, validate untrusted form values with Zod, apply the relevant business rules, and then access PostgreSQL. Registration and login validate credentials before creating or reading the session. The acting user ID for reservations comes from the authenticated database user, not the form.

Server Actions keep mutations callable directly from forms while running authorization, validation, and database writes on the server. `src/lib/booking-rules.ts` keeps reservation-time policy in a pure function, making it reusable and unit-testable without a database or dependence on the server's local time zone.

## Key engineering decisions

- The reservation action performs an overlap pre-check for a friendly response, while PostgreSQL's exclusion constraint is the concurrency-safe final authority. Constraint failures are translated into the same friendly overlap message.
- Timestamps use PostgreSQL `timestamptz`; shared formatting and `datetime-local` conversion use the `Asia/Colombo` time zone, while submitted and stored instants are UTC.
- Reservations are cancelled by status and timestamp, not deleted. Resources are deactivated rather than hard-deleted.
- Server Actions authenticate and authorize each mutation themselves; access to a page or hidden UI is not the mutation's security check.
- The JWT carries a user ID, and `getCurrentUser()` re-loads the user from the database on each request so role changes and removed users take effect. React `cache()` deduplicates the lookup within a request.
- Booking-time validation is a pure function so its business rules can be tested independently from database access.

## Testing

`npm test` runs the Vitest tests in `src/lib/booking-rules.test.ts`. The suite covers valid times, past start, reversed range, slot boundaries, minimum and maximum duration, opening hours, weekend dates, the advance limit, and back-to-back bookings.

The optional database-backed concurrency demonstration is run with:

```bash
npx tsx scripts/concurrency-test.ts
```

It finds `Lovelace Boardroom` and a Member, chooses an unoccupied weekday one-hour slot about 40 days ahead, and submits 10 simultaneous direct Prisma inserts. With the database overlap constraint in place, the expected output is:

```text
Concurrent reservation attempts: 1 succeeded, 9 rejected (expected 1 and 9).
```

The script deletes rows with its unique `Concurrency test ...` title prefix and disconnects from Prisma when finished. It tests the database constraint directly; it does not call the booking Server Action or exercise the 30-day application rule.

Manual checks for the app:

| Check | Expected result |
|---|---|
| Submit two overlapping confirmed reservations for one resource | The second is rejected with the friendly overlap message |
| Submit reservations where one ends exactly as the next starts | Both are accepted |
| Submit a booking whose start is in the past | The booking action rejects it |
| Exceed a resource's `maxDurationHours` | The booking action rejects it |
| Book before 08:00, start at/after 20:00, or end after 20:00 | The booking action rejects it |
| Book on a Saturday or Sunday | The booking action rejects it |
| Book more than 30 days ahead | The booking action rejects it |
| A Member attempts to create a sixth confirmed reservation that has not ended | The booking action rejects it |
| A user changes a cancellation request to another user's reservation ID | Cancellation is denied unless the caller is an Admin |
| A non-admin opens an admin route or submits an admin resource action | The route redirects and the action independently enforces admin authorization |

## Assumptions and limitations

- The seed data and office layout are fictional demo data; the application supports the listed building resources but does not model floors as a separate entity.
- Resource, category, and personal reservation list queries use a maximum of 1,000 rows. The resource-day timeline query is limited to 100 reservations for the selected day.
- The concurrency script requires a reachable configured PostgreSQL database, the seeded `Lovelace Boardroom`, a Member user, and the migrated overlap constraint. Its expected counts depend on the chosen free slot remaining unused during the test.

## Possible future improvements

- Recurring reservations.
- Reservation notifications.
- Reservation approval workflows.

## Demo video

[https://drive.google.com/file/d/18Zpyj6Hp11TTjrXdggNCcSd5UtVZV5bu/view?usp=drive_link]
