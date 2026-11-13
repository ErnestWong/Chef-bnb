/**
 * Seed: ~6 fake chefs, ~15 events across boroughs/cuisines/dates, bookings in
 * every state, a few reviews — so every milestone is demoable.
 *
 *   pnpm db:seed
 *
 * Wipes and recreates all app data. Refuses to run against Vercel production.
 */
import { createPrismaClient } from "../src/lib/db";
import type { BookingStatus, BookingType, Borough } from "../src/generated/prisma/enums";
import { RULES } from "../src/lib/bookings/rules";

if (process.env.VERCEL_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "yes") {
  throw new Error("Refusing to seed the production database. Set SEED_ALLOW_PRODUCTION=yes to override.");
}

const db = createPrismaClient();

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

const cuisines = [
  "Cantonese",
  "Fusion",
  "Bistro",
  "Italian",
  "Mexican",
  "Japanese",
  "Korean",
  "Middle Eastern",
  "Vegetarian",
  "Southern",
].map((name) => ({ name, slug: name.toLowerCase().replace(/\s+/g, "-") }));

type ChefSeed = {
  email: string;
  name: string;
  slug: string;
  bio: string;
  credentials: string;
  cuisines: string[];
  borough: Borough;
  neighborhood: string;
  crossStreets: string;
  lat: number;
  lng: number;
  paymentHandle: string;
};

const chefs: ChefSeed[] = [
  {
    email: "casa.wong@example.test",
    name: "Casa Wong",
    slug: "casa-wong",
    bio: "Cantonese home cooking the way it tastes in the family kitchen: soy-braised everything, a proper wok hei, and too much food.",
    credentials: "NYC Food Protection Certificate; 10 years of family dinners",
    cuisines: ["Cantonese", "Fusion"],
    borough: "QUEENS",
    neighborhood: "Flushing",
    crossStreets: "Main St & Roosevelt Ave",
    lat: 40.759,
    lng: -73.83,
    paymentHandle: "@casa-wong",
  },
  {
    email: "maya.r@example.test",
    name: "Maya Rosen",
    slug: "maya-rosen",
    bio: "Sous chef by night, supper club host on Sundays. Seasonal bistro plates built around the Union Square greenmarket.",
    credentials: "ICE graduate; sous chef, West Village bistro",
    cuisines: ["Bistro", "Vegetarian"],
    borough: "MANHATTAN",
    neighborhood: "East Village",
    crossStreets: "Ave A & E 7th St",
    lat: 40.726,
    lng: -73.983,
    paymentHandle: "@maya-rosen",
  },
  {
    email: "tomas.v@example.test",
    name: "Tomás Villanueva",
    slug: "tomas-villanueva",
    bio: "Oaxacan moles, fresh masa, mezcal pairings you bring yourself. Eight seats around one long table.",
    credentials: "Line cook, 6 years; NYC Food Protection Certificate",
    cuisines: ["Mexican"],
    borough: "BROOKLYN",
    neighborhood: "Bushwick",
    crossStreets: "Knickerbocker Ave & Troutman St",
    lat: 40.704,
    lng: -73.922,
    paymentHandle: "@tomas-v",
  },
  {
    email: "hana.k@example.test",
    name: "Hana Kim",
    slug: "hana-kim",
    bio: "Korean banchan spreads and slow braises. Small groups, long dinners, lots of side dishes.",
    credentials: "Private chef; culinary school in Seoul",
    cuisines: ["Korean", "Fusion"],
    borough: "BROOKLYN",
    neighborhood: "Williamsburg",
    crossStreets: "Bedford Ave & N 7th St",
    lat: 40.717,
    lng: -73.957,
    paymentHandle: "@hana-kim",
  },
  {
    email: "luca.b@example.test",
    name: "Luca Bianchi",
    slug: "luca-bianchi",
    bio: "Handmade pasta, Roman classics, nothing fussy. Bring a bottle of something red.",
    credentials: "Pasta station, Midtown trattoria; NYC Food Protection Certificate",
    cuisines: ["Italian"],
    borough: "MANHATTAN",
    neighborhood: "Lower East Side",
    crossStreets: "Orchard St & Rivington St",
    lat: 40.72,
    lng: -73.989,
    paymentHandle: "@luca-b",
  },
  {
    email: "amira.h@example.test",
    name: "Amira Haddad",
    slug: "amira-haddad",
    bio: "Levantine mezze and grilled things, served family style on the roof when the weather allows.",
    credentials: "Caterer, 4 years",
    cuisines: ["Middle Eastern", "Vegetarian"],
    borough: "QUEENS",
    neighborhood: "Astoria",
    crossStreets: "Steinway St & 30th Ave",
    lat: 40.764,
    lng: -73.917,
    paymentHandle: "@amira-h",
  },
];

const guestNames = [
  "Priya Natarajan",
  "Jordan Lee",
  "Sam Okafor",
  "Elena Petrova",
  "Marcus Hill",
  "Yuki Tanaka",
  "Dana Cohen",
  "Chris Alvarez",
  "Noor Rahman",
  "Ben Fischer",
];

type EventSeed = {
  chef: number;
  title: string;
  daysFromNow: number;
  hour: number;
  price: number;
  min: number;
  max: number;
  types: BookingType[];
  status?: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  dietary?: string;
};

const events: EventSeed[] = [
  // Past (completed) — produce attended/no-show bookings and reviews
  { chef: 0, title: "Sunday Cantonese Feast", daysFromNow: -21, hour: 18, price: 6500, min: 4, max: 8, types: ["SEAT", "GROUP"], status: "COMPLETED" },
  { chef: 1, title: "Greenmarket Supper", daysFromNow: -14, hour: 19, price: 8500, min: 4, max: 10, types: ["SEAT", "GROUP", "BUYOUT"], status: "COMPLETED" },
  { chef: 2, title: "Mole Night", daysFromNow: -7, hour: 19, price: 7500, min: 4, max: 8, types: ["SEAT", "GROUP"], status: "COMPLETED" },
  // Cancelled (under minimum)
  { chef: 5, title: "Rooftop Mezze", daysFromNow: -3, hour: 18, price: 7000, min: 6, max: 10, types: ["SEAT", "GROUP", "BUYOUT"], status: "CANCELLED" },
  // Upcoming, published
  { chef: 0, title: "Dim Sum Brunch Table", daysFromNow: 5, hour: 11, price: 5500, min: 4, max: 10, types: ["SEAT", "GROUP"], dietary: "Shellfish throughout; vegetarian plates on request" },
  { chef: 3, title: "Banchan & Braise", daysFromNow: 6, hour: 19, price: 8000, min: 4, max: 8, types: ["SEAT", "GROUP", "BUYOUT"] },
  { chef: 4, title: "Cacio e Pepe Night", daysFromNow: 8, hour: 19, price: 7000, min: 4, max: 8, types: ["SEAT", "GROUP", "BUYOUT"] },
  { chef: 1, title: "Late Autumn Bistro", daysFromNow: 10, hour: 19, price: 9000, min: 4, max: 8, types: ["GROUP", "BUYOUT"] },
  { chef: 2, title: "Tlayudas on the Patio", daysFromNow: 12, hour: 18, price: 6500, min: 6, max: 10, types: ["SEAT", "GROUP"] },
  { chef: 5, title: "Mezze for Six", daysFromNow: 14, hour: 19, price: 7000, min: 6, max: 6, types: ["BUYOUT"] },
  { chef: 3, title: "Kimchi Jjigae Weeknight", daysFromNow: 17, hour: 19, price: 6000, min: 2, max: 6, types: ["SEAT", "GROUP"] },
  { chef: 0, title: "Hot Pot for the Whole Table", daysFromNow: 21, hour: 18, price: 7500, min: 6, max: 10, types: ["BUYOUT", "GROUP"] },
  { chef: 4, title: "Roman Trattoria Sunday", daysFromNow: 24, hour: 17, price: 7500, min: 4, max: 8, types: ["SEAT", "GROUP", "BUYOUT"] },
  { chef: 1, title: "Vegetarian Tasting", daysFromNow: 30, hour: 19, price: 8500, min: 4, max: 8, types: ["SEAT", "GROUP"], dietary: "Fully vegetarian; vegan on request" },
  // Draft
  { chef: 5, title: "Winter Mezze (draft)", daysFromNow: 40, hour: 19, price: 7000, min: 6, max: 10, types: ["SEAT", "GROUP", "BUYOUT"], status: "DRAFT" },
];

function at(daysFromNow: number, hour: number): Date {
  const d = new Date();
  d.setUTCHours(hour + 5, 0, 0, 0); // roughly America/New_York evening
  return new Date(d.getTime() + daysFromNow * DAY);
}

async function reset() {
  // Children first; cascades handle the rest, but be explicit for clarity.
  await db.review.deleteMany();
  await db.bookingLog.deleteMany();
  await db.booking.deleteMany();
  await db.event.deleteMany();
  await db.menu.deleteMany();
  await db.venue.deleteMany();
  await db.chefProfile.deleteMany();
  await db.cuisine.deleteMany();
  await db.user.deleteMany({ where: { email: { endsWith: "@example.test" } } });
}

async function main() {
  await reset();

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  for (const email of adminEmails) {
    await db.user.upsert({
      where: { email },
      update: { roles: ["GUEST", "ADMIN"] },
      create: { email, name: email.split("@")[0], roles: ["GUEST", "ADMIN"] },
    });
  }

  await db.cuisine.createMany({ data: cuisines });
  const cuisineBySlug = Object.fromEntries((await db.cuisine.findMany()).map((c) => [c.name, c.id]));

  const chefIds: string[] = [];
  const venueIds: string[] = [];
  const menuIds: string[] = [];
  for (const c of chefs) {
    const user = await db.user.create({
      data: { email: c.email, name: c.name, roles: ["GUEST", "CHEF"], emailVerified: new Date() },
    });
    const profile = await db.chefProfile.create({
      data: {
        userId: user.id,
        displayName: c.name,
        slug: c.slug,
        bio: c.bio,
        credentials: c.credentials,
        homeBorough: c.borough,
        status: "APPROVED",
        paymentHandle: c.paymentHandle,
        paymentNote: "Venmo or Zelle within 48 hours to hold your seat.",
        cuisines: { connect: c.cuisines.map((name) => ({ id: cuisineBySlug[name] })) },
      },
    });
    chefIds.push(profile.id);
    const venue = await db.venue.create({
      data: {
        ownerUserId: user.id,
        type: "CHEF_HOME",
        address: `${100 + chefIds.length} ${c.crossStreets.split(" & ")[0]}, Apt ${chefIds.length}B`,
        neighborhood: c.neighborhood,
        borough: c.borough,
        crossStreets: c.crossStreets,
        lat: c.lat,
        lng: c.lng,
        capacity: 10,
      },
    });
    venueIds.push(venue.id);
    const menu = await db.menu.create({
      data: {
        chefId: profile.id,
        title: `${c.name} sample menu`,
        isSample: true,
        courses: [
          { name: "Welcome bites", description: "Something small while everyone arrives" },
          { name: "Family-style mains", description: c.cuisines.join(" / "), dietary: "Vegetarian option on request" },
          { name: "Dessert", description: "Seasonal" },
        ],
      },
    });
    menuIds.push(menu.id);
  }

  // Two applicants still in the queue, one rejected
  for (const [i, status] of (["APPLIED", "APPLIED", "REJECTED"] as const).entries()) {
    const user = await db.user.create({
      data: { email: `applicant${i}@example.test`, name: `Applicant ${i + 1}` },
    });
    await db.chefProfile.create({
      data: {
        userId: user.id,
        displayName: `Applicant ${i + 1}`,
        slug: `applicant-${i + 1}`,
        bio: "Applied through the intake form.",
        status,
        reviewNote: status === "REJECTED" ? "No food handling certificate yet." : null,
      },
    });
  }

  const guests = [];
  for (const [i, name] of guestNames.entries()) {
    guests.push(
      await db.user.create({
        data: { email: `guest${i + 1}@example.test`, name, emailVerified: new Date() },
      }),
    );
  }

  let bookingsCreated = 0;
  let reviewsCreated = 0;
  for (const [i, e] of events.entries()) {
    const startsAt = at(e.daysFromNow, e.hour);
    const chef = chefs[e.chef];
    const status = e.status ?? "PUBLISHED";
    const event = await db.event.create({
      data: {
        chefId: chefIds[e.chef],
        venueId: venueIds[e.chef],
        // Every other event has its menu posted; the rest show the "closer to the date" note.
        menuId: i % 2 === 0 ? menuIds[e.chef] : null,
        title: e.title,
        description: `${chef.bio.split(".")[0]}. Bring your own bottle.`,
        startsAt,
        durationMin: 150,
        priceCents: e.price,
        minGuests: e.min,
        maxGuests: e.max,
        allowedBookingTypes: e.types,
        goNoGoAt: new Date(startsAt.getTime() - RULES.GO_NO_GO_HOURS * HOUR),
        status,
        mode: "UNSOLD",
        borough: chef.borough,
        byob: true,
        byobNote: "BYOB — nothing is sold or included.",
        dietaryNotes: e.dietary ?? null,
        cancelledAt: status === "CANCELLED" ? new Date(startsAt.getTime() - RULES.GO_NO_GO_HOURS * HOUR) : null,
        cancelReason: status === "CANCELLED" ? "Fewer than the minimum confirmed by the cutoff." : null,
        completedAt: status === "COMPLETED" ? new Date(startsAt.getTime() + 150 * 60 * 1000) : null,
        cuisines: { connect: chef.cuisines.map((name) => ({ id: cuisineBySlug[name] })) },
      },
    });

    // Bookings: a deterministic mix per event so every status appears.
    type Plan = { guest: number; type: BookingType; size: number; status: BookingStatus; note?: string };
    let plan: Plan[] = [];
    if (status === "COMPLETED") {
      plan = [
        { guest: (i + 0) % 10, type: "GROUP", size: 2, status: "ATTENDED" },
        { guest: (i + 1) % 10, type: "SEAT", size: 1, status: "ATTENDED" },
        { guest: (i + 2) % 10, type: "SEAT", size: 1, status: "NO_SHOW" },
        { guest: (i + 3) % 10, type: "SEAT", size: 1, status: "CANCELLED" },
      ];
    } else if (status === "CANCELLED") {
      plan = [
        { guest: 4, type: "GROUP", size: 2, status: "CANCELLED" },
        { guest: 5, type: "SEAT", size: 1, status: "CANCELLED" },
      ];
    } else if (status === "PUBLISHED") {
      if (e.types.includes("BUYOUT") && e.types.length === 1) {
        plan = [{ guest: 6, type: "BUYOUT", size: e.min, status: "CONFIRMED", note: "One vegetarian" }];
      } else if (e.types.includes("SEAT")) {
        plan = [
          { guest: (i + 0) % 10, type: "SEAT", size: 1, status: "CONFIRMED" },
          { guest: (i + 1) % 10, type: "GROUP", size: 2, status: "REQUESTED", note: "No nuts, please" },
          { guest: (i + 2) % 10, type: "SEAT", size: 1, status: "EXPIRED" },
        ];
        if (i % 3 === 0) plan.push({ guest: (i + 3) % 10, type: "SEAT", size: 1, status: "CANCELLED" });
      } else {
        plan = [{ guest: (i + 0) % 10, type: "GROUP", size: 3, status: "REQUESTED" }];
      }
    }

    let mode: "UNSOLD" | "OPEN" | "BOUGHT_OUT" = "UNSOLD";
    for (const p of plan) {
      const guest = guests[p.guest];
      const amount = p.type === "BUYOUT" ? e.price * Math.max(p.size, e.min) : e.price * p.size;
      const createdAt = new Date(startsAt.getTime() - (10 + p.guest) * DAY);
      const booking = await db.booking.create({
        data: {
          eventId: event.id,
          guestUserId: guest.id,
          type: p.type,
          partySize: p.size,
          amountCents: amount,
          status: p.status,
          dietaryNotes: p.note ?? null,
          createdAt,
          paidMarkedAt: ["CONFIRMED", "ATTENDED", "NO_SHOW"].includes(p.status) ? new Date(createdAt.getTime() + DAY) : null,
          addressSentAt: ["ATTENDED", "NO_SHOW"].includes(p.status) ? new Date(startsAt.getTime() - 48 * HOUR) : null,
          reviewRequestedAt: p.status === "ATTENDED" ? new Date(startsAt.getTime() + 12 * HOUR) : null,
          cancelledAt: p.status === "CANCELLED" ? new Date(createdAt.getTime() + 2 * DAY) : null,
        },
      });
      bookingsCreated++;

      // Log the path each booking took.
      const path: BookingStatus[] =
        p.status === "REQUESTED" ? ["REQUESTED"]
        : p.status === "EXPIRED" ? ["REQUESTED", "EXPIRED"]
        : p.status === "CANCELLED" ? ["REQUESTED", "CANCELLED"]
        : p.status === "CONFIRMED" ? ["REQUESTED", "CONFIRMED"]
        : ["REQUESTED", "CONFIRMED", p.status];
      let prev: BookingStatus | null = null;
      for (const [k, s] of path.entries()) {
        await db.bookingLog.create({
          data: {
            bookingId: booking.id,
            fromStatus: prev,
            toStatus: s,
            actorUserId: s === "EXPIRED" ? null : s === "REQUESTED" || s === "CANCELLED" ? guest.id : null,
            note: s === "CONFIRMED" ? "Marked paid by chef" : s === "EXPIRED" ? "48 h unpaid" : null,
            at: new Date(createdAt.getTime() + k * 6 * HOUR),
          },
        });
        prev = s;
      }

      if (["REQUESTED", "CONFIRMED", "ATTENDED", "NO_SHOW"].includes(p.status)) {
        mode = p.type === "BUYOUT" ? "BOUGHT_OUT" : "OPEN";
      }

      if (p.status === "ATTENDED") {
        await db.review.create({
          data: {
            bookingId: booking.id,
            eventId: event.id,
            chefId: chefIds[e.chef],
            authorId: guest.id,
            rating: 4 + ((i + p.guest) % 2),
            body:
              p.guest % 2 === 0
                ? "Warm host, generous portions, left with new friends. Would book again."
                : "Great food and a very relaxed table. Bring more wine than you think.",
            createdAt: new Date(startsAt.getTime() + DAY),
          },
        });
        reviewsCreated++;
      }
    }
    if (mode !== "UNSOLD") {
      await db.event.update({ where: { id: event.id }, data: { mode } });
    }
  }

  console.log(
    `Seeded ${chefs.length} chefs (+3 applicants), ${guests.length} guests, ${events.length} events, ${bookingsCreated} bookings, ${reviewsCreated} reviews.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
