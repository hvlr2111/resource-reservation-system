# Resource Reservation Management System

A full-stack web application that helps an organization manage its shared
facilities and resources, and coordinate reservations in one central place.

## Problem

Reservations were handled through informal communication and manual records,
which led to scheduling confusion, overlapping bookings, and uncertainty about
what was available. This system replaces that with a single source of truth.

## Solution

- Admins manage resources (rooms, equipment, vehicles, etc.) and see usage across the organization.
- Members browse resources, check availability on a timeline, and make or cancel reservations.
- Double bookings are impossible: overlaps are rejected by a PostgreSQL
  exclusion constraint, so the rule holds even when two users book at the same moment.

## Key Features

- Role-based access (Admin / Member) enforced on the server
- Resource management with categories, capacity, location, and active/inactive status
- Reservation creation with validation (no past bookings, duration limits, end after start)
- Availability timeline per resource and day
- "My reservations" with cancellation (soft cancel, history preserved)
- Admin overview with filters, pagination, and usage summary

## Tech Stack

Next.js (App Router) · TypeScript · PostgreSQL · Prisma · Tailwind CSS ·
shadcn/ui · Zod · Docker Compose

## Key Engineering Decisions

- **Database-level overlap protection:** `btree_gist` exclusion constraint on `tstzrange`, avoiding race conditions that application-only checks can't prevent.
- **UTC storage:** all timestamps stored as `timestamptz` and displayed in local time.
- **Soft cancellation and deactivation:** reservation history stays intact for reporting.
- **Server-side authorization:** every action verifies the user's role, not just the UI.