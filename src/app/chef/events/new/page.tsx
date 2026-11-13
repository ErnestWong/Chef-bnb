import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EventForm } from "@/components/event-form";
import { Container } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { listCuisines } from "@/lib/queries/events";

export const metadata: Metadata = { title: "New dinner" };

export default function NewEventPage() {
  return (
    <main className="flex-1">
      <Container className="max-w-3xl py-12">
        <p className="text-sm text-muted"><Link href="/chef" className="hover:text-accent">Chef dashboard</Link> / New dinner</p>
        <h1 className="font-display mt-2 text-4xl">New dinner</h1>
        <Suspense fallback={<p className="mt-8 text-sm text-muted">Loading…</p>}>
          <NewEventForm />
        </Suspense>
      </Container>
    </main>
  );
}

async function NewEventForm() {
  const user = await requireRole("CHEF", "/chef/events/new");
  const db = getDb();
  const [venues, menus, cuisines, profile] = await Promise.all([
    db.venue.findMany({ where: { ownerUserId: user.id }, select: { id: true, neighborhood: true, borough: true, crossStreets: true }, orderBy: { createdAt: "asc" } }),
    db.menu.findMany({ where: { chef: { userId: user.id } }, select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
    listCuisines(),
    db.chefProfile.findUnique({ where: { userId: user.id }, select: { cuisines: { select: { id: true } } } }),
  ]);
  return (
    <div className="mt-8">
      <EventForm
        venues={venues}
        menus={menus}
        cuisines={cuisines}
        values={{
          title: "",
          description: "",
          date: "",
          time: "19:00",
          durationMin: 150,
          priceDollars: 75,
          minGuests: 4,
          maxGuests: 8,
          cuisineIds: profile?.cuisines.map((c) => c.id) ?? [],
          allowedBookingTypes: ["SEAT", "GROUP", "BUYOUT"],
          dietaryNotes: "",
          byobNote: "",
          venueId: venues[0]?.id ?? "",
          menuId: "",
        }}
      />
      <p className="mt-6 text-xs text-muted">Review headcount and unpaid requests in your guest list. Cancellations are managed manually for now.</p>
    </div>
  );
}
