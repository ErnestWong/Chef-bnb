/**
 * Seed: 5 fake chefs with 5 dinners each (25 events across boroughs,
 * cuisines and dates), 5 fake guests, bookings in every state, reviews, and a
 * small admin queue, so every screen has something to show.
 *
 *   pnpm db:seed
 *
 * Wipes and recreates all app data. Refuses to run against Vercel production.
 */
import { config as loadEnv } from "dotenv";
import { createPrismaClient, type Db } from "../src/lib/db";

loadEnv({ path: [".env.local", ".env"], quiet: true });
import type { BookingStatus, BookingType, Borough } from "../src/generated/prisma/enums";
import { RULES } from "../src/lib/bookings/rules";

if (process.env.VERCEL_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "yes") {
  throw new Error("Refusing to seed the production database. Set SEED_ALLOW_PRODUCTION=yes to override.");
}

// Set by seedDemo(); the CLI entry point at the bottom creates its own client.
let db: Db;

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

type Course = { name: string; description?: string; dietary?: string };

type ChefSeed = {
  email: string;
  name: string;
  slug: string;
  /** [header, portrait]: the chef's header image and a small photo. Stock until they upload. */
  photos: [string, string];
  bio: string;
  credentials: string;
  instagram: string;
  cuisines: string[];
  borough: Borough;
  neighborhood: string;
  crossStreets: string;
  lat: number;
  lng: number;
  paymentHandle: string;
  menu: { title: string; courses: Course[] };
};

const chefs: ChefSeed[] = [
  {
    email: "casa.wong@example.test",
    name: "Casa Wong",
    slug: "casa-wong",
    photos: [`https://images.unsplash.com/photo-1530062845289-9109b2c9c868?w=1800&q=70`, `https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&q=70`],
    bio: "Cantonese home cooking the way it tastes in the family kitchen: soy-braised everything, a proper wok hei, and too much food. Ten seats around the big round table, lazy Susan included.",
    credentials: "Ten years of Sunday family dinners; two years of a monthly supper club",
    instagram: "casawongnyc",
    cuisines: ["Cantonese", "Fusion"],
    borough: "QUEENS",
    neighborhood: "Flushing",
    crossStreets: "Main St & Roosevelt Ave",
    lat: 40.759,
    lng: -73.83,
    paymentHandle: "@casa-wong",
    menu: {
      title: "Sunday feast",
      courses: [
        { name: "Soy-poached chicken", description: "With ginger-scallion oil" },
        { name: "Steamed whole fish", description: "Black bass, soy, cilantro", dietary: "Contains fish" },
        { name: "Clay-pot rice", description: "Lap cheong, mushrooms, crispy bottom" },
        { name: "Gai lan", description: "Oyster sauce, garlic", dietary: "Vegetarian version without oyster sauce" },
        { name: "Red bean soup", description: "With tangerine peel" },
      ],
    },
  },
  {
    email: "maya.r@example.test",
    name: "Maya Rosen",
    slug: "maya-rosen",
    photos: [`https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1800&q=70`, `https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=70`],
    bio: "Sous chef by night, supper club host on Sundays. Seasonal bistro plates built around whatever the Union Square greenmarket had that morning, served in a railroad apartment with one long table.",
    credentials: "ICE graduate; sous chef, West Village bistro",
    instagram: "mayarosencooks",
    cuisines: ["Bistro", "Vegetarian"],
    borough: "MANHATTAN",
    neighborhood: "East Village",
    crossStreets: "Ave A & E 7th St",
    lat: 40.726,
    lng: -73.983,
    paymentHandle: "@maya-rosen",
    menu: {
      title: "Greenmarket supper",
      courses: [
        { name: "Radishes and cultured butter", description: "Flaky salt, rye crisps" },
        { name: "Chilled beet soup", description: "Dill, crème fraîche", dietary: "Vegetarian" },
        { name: "Roast chicken for the table", description: "Jus, charred alliums", dietary: "Vegetarian main on request" },
        { name: "Apple tart", description: "Brown butter, vanilla ice cream" },
      ],
    },
  },
  {
    email: "tomas.v@example.test",
    name: "Tomás Villanueva",
    slug: "tomas-villanueva",
    photos: [`https://images.unsplash.com/photo-1507048331197-7d4ac70811cf?w=1800&q=70`, `https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=600&q=70`],
    bio: "Oaxacan moles, fresh masa, and mezcal pairings you bring yourself. Eight seats around one long table in a Bushwick loft; the tortillas come off the comal while you watch.",
    credentials: "Line cook, 6 years, two Brooklyn kitchens",
    instagram: "tomascocina",
    cuisines: ["Mexican"],
    borough: "BROOKLYN",
    neighborhood: "Bushwick",
    crossStreets: "Knickerbocker Ave & Troutman St",
    lat: 40.704,
    lng: -73.922,
    paymentHandle: "@tomas-v",
    menu: {
      title: "Mole night",
      courses: [
        { name: "Tetelas", description: "Black bean, queso fresco, salsa macha" },
        { name: "Sopa de guías", description: "Squash vine soup", dietary: "Vegan" },
        { name: "Mole negro", description: "Turkey, house tortillas", dietary: "Contains nuts; vegetarian with roasted squash" },
        { name: "Nicuatole", description: "Corn pudding, cinnamon" },
      ],
    },
  },
  {
    email: "hana.k@example.test",
    name: "Hana Kim",
    slug: "hana-kim",
    photos: [`https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=1800&q=70`, `https://images.unsplash.com/photo-1605522561233-768ad7a8fabf?w=600&q=70`],
    bio: "Korean banchan spreads and slow braises. Small groups, long dinners, lots of side dishes. Expect twelve little plates before the main course even shows up.",
    credentials: "Private chef; culinary school in Seoul",
    instagram: "hanakimtable",
    cuisines: ["Korean", "Fusion"],
    borough: "BROOKLYN",
    neighborhood: "Williamsburg",
    crossStreets: "Bedford Ave & N 7th St",
    lat: 40.717,
    lng: -73.957,
    paymentHandle: "@hana-kim",
    menu: {
      title: "Banchan and braise",
      courses: [
        { name: "Twelve banchan", description: "Kimchi, namul, jeon, pickles", dietary: "Mostly vegetarian; fish sauce in the kimchi" },
        { name: "Galbi jjim", description: "Braised short rib, chestnuts, jujube" },
        { name: "Doenjang jjigae", description: "Soybean stew, tofu, zucchini", dietary: "Vegetarian" },
        { name: "Hotteok", description: "Brown sugar pancakes" },
      ],
    },
  },
  {
    email: "luca.b@example.test",
    name: "Luca Bianchi",
    slug: "luca-bianchi",
    photos: [`https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=1800&q=70`, `https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&q=70`],
    bio: "Handmade pasta, Roman classics, nothing fussy. Bring a bottle of something red. Six to eight people, a walk-up on Orchard Street, and a sheet of pasta rolled by hand before you arrive.",
    credentials: "Pasta station, Midtown trattoria, four years",
    instagram: "lucafapasta",
    cuisines: ["Italian"],
    borough: "MANHATTAN",
    neighborhood: "Lower East Side",
    crossStreets: "Orchard St & Rivington St",
    lat: 40.72,
    lng: -73.989,
    paymentHandle: "@luca-b",
    menu: {
      title: "Roman table",
      courses: [
        { name: "Carciofi alla giudia", description: "Fried artichokes, lemon", dietary: "Vegan" },
        { name: "Tonnarelli cacio e pepe", description: "Rolled that afternoon", dietary: "Vegetarian" },
        { name: "Saltimbocca", description: "Veal, prosciutto, sage" },
        { name: "Maritozzi", description: "Cream buns" },
      ],
    },
  },
];

const guestNames = ["Priya Natarajan", "Jordan Lee", "Sam Okafor", "Elena Petrova", "Marcus Hill"];

type EventSeed = {
  chef: number;
  title: string;
  description: string;
  daysFromNow: number;
  hour: number;
  price: number;
  min: number;
  max: number;
  types: BookingType[];
  status?: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  dietary?: string;
  photos?: string[];
};

/**
 * Five dinners per chef: one completed (attended guests, reviews), three
 * upcoming, and one special case per chef (draft, cancelled, within 48 h so
 * the address job fires, past its cutoff and under-booked so go/no-go cancels
 * it, buyout-only). Dates spread over the next five weeks so the calendar
 * and filters have something to do.
 */
/** Stock photos stand in until chefs upload their own (brand guide: real tables, mid-moment). */
const pic = (id: string) => `https://images.unsplash.com/photo-${id}?w=1600&q=70`;
const PHOTOS = {
  table: pic("1414235077428-338989a2e8c0"), party: pic("1529042410759-befb1204b468"), room: pic("1517248135467-4c7edcad34c4"),
  feast: pic("1555939594-58d7cb561ad1"), plate: pic("1504674900247-0877df9cc836"), dinner: pic("1476124369491-e7addf5db371"),
  dumplings: pic("1563245372-f21724e3856d"), dimsum: pic("1551183053-bf91a1d81141"), noodles: pic("1555126634-323283e090fa"),
  greens: pic("1498837167922-ddd27525d352"), salad: pic("1512621776951-a57141f2eefd"), market: pic("1488459716781-31db52582fe9"),
  tacos: pic("1601050690597-df0568f70950"), mexican: pic("1565299624946-b28f40a0ae38"), toast: pic("1482049016688-2d3e1b311543"),
  korean: pic("1532980400857-e8d9d275d858"), bowl: pic("1546069901-ba9599a7e63c"), stew: pic("1547592166-23ac45744acd"),
  pasta: pic("1551504734-5ee1c4a1479b"), pasta2: pic("1543353071-873f17a7a088"), bread: pic("1509440159596-0249088772ff"),
  hands: pic("1540189549336-e6e99c3679fe"), candles: pic("1515003197210-e0cd71810b5f"), wine: pic("1510812431401-41d2bd2722f3"),
};

/**
 * Per chef: three finished dinners (attended guests, photos, reviews), three
 * upcoming, and one special case (draft, cancelled, within 48 h so the
 * address job fires, past its cutoff and under-booked so go/no-go cancels
 * it, buyout-only). Dates spread over the next five weeks so the calendar
 * and filters have something to do.
 */
const events: EventSeed[] = [
  // Casa Wong
  { chef: 0, title: "Sunday Cantonese Feast", description: "The full Sunday spread: poached chicken, a whole steamed fish, clay-pot rice with the crispy bottom fought over.", daysFromNow: -21, hour: 18, price: 6500, min: 4, max: 8, types: ["SEAT", "GROUP"], status: "COMPLETED", photos: [PHOTOS.feast, PHOTOS.table, PHOTOS.hands] },
  { chef: 0, title: "Dumpling Night", description: "Three fillings, two folds, one long table. You pleat, I fry. Nobody keeps count.", daysFromNow: -42, hour: 19, price: 5500, min: 4, max: 10, types: ["SEAT", "GROUP"], status: "COMPLETED", photos: [PHOTOS.dumplings, PHOTOS.party] },
  { chef: 0, title: "Congee and Crullers", description: "A late Sunday breakfast at 1 pm: congee three ways, youtiao, pickles, tea. Quiet and restorative.", daysFromNow: -63, hour: 13, price: 4500, min: 4, max: 8, types: ["SEAT", "GROUP"], status: "COMPLETED", photos: [PHOTOS.bowl, PHOTOS.room] },
  { chef: 0, title: "Dim Sum Brunch Table", description: "Har gow, siu mai, cheung fun and turnip cake, all folded that morning. Bring something sparkling.", daysFromNow: 5, hour: 11, price: 5500, min: 4, max: 10, types: ["SEAT", "GROUP"], dietary: "Shellfish throughout; vegetarian plates on request", photos: [PHOTOS.dimsum, PHOTOS.table] },
  { chef: 0, title: "Hot Pot for the Whole Table", description: "Two broths, a table full of things to dip, and nobody leaves before midnight. Buyouts and big groups only.", daysFromNow: 21, hour: 18, price: 7500, min: 6, max: 10, types: ["BUYOUT", "GROUP"], photos: [PHOTOS.noodles] },
  { chef: 0, title: "Lunar New Year Preview", description: "Eight lucky dishes, a trial run of the family menu before the real thing.", daysFromNow: 33, hour: 18, price: 8000, min: 6, max: 10, types: ["SEAT", "GROUP", "BUYOUT"], photos: [PHOTOS.feast] },
  { chef: 0, title: "Winter Congee Night", description: "Not announced yet. Congee three ways and youtiao.", daysFromNow: 40, hour: 19, price: 4500, min: 4, max: 8, types: ["SEAT", "GROUP"], status: "DRAFT" },
  // Maya Rosen
  { chef: 1, title: "Greenmarket Supper", description: "Whatever looked best at Union Square that morning, cooked simply, served family style.", daysFromNow: -14, hour: 19, price: 8500, min: 4, max: 10, types: ["SEAT", "GROUP", "BUYOUT"], status: "COMPLETED", photos: [PHOTOS.greens, PHOTOS.market, PHOTOS.candles] },
  { chef: 1, title: "Tomato Season, Last Call", description: "Six kinds of tomato, bread, anchovies, a roast chicken, and a peach tart because it was still August.", daysFromNow: -77, hour: 19, price: 8000, min: 4, max: 8, types: ["SEAT", "GROUP"], status: "COMPLETED", photos: [PHOTOS.salad, PHOTOS.dinner] },
  { chef: 1, title: "Soup and Bread", description: "A Tuesday in the rain: two soups, three breads, butter from the market, a bottle you bring.", daysFromNow: -35, hour: 19, price: 5500, min: 4, max: 8, types: ["SEAT", "GROUP"], status: "COMPLETED", photos: [PHOTOS.bread, PHOTOS.stew] },
  { chef: 1, title: "Late Autumn Bistro", description: "Roast chicken, braised leeks, an apple tart. The last of the fall produce before it turns to roots.", daysFromNow: 10, hour: 19, price: 9000, min: 4, max: 8, types: ["GROUP", "BUYOUT"], photos: [PHOTOS.dinner, PHOTOS.wine] },
  { chef: 1, title: "Vegetarian Tasting", description: "Six vegetable courses, no main-course meat stand-in, no apologies.", daysFromNow: 30, hour: 19, price: 8500, min: 4, max: 8, types: ["SEAT", "GROUP"], dietary: "Fully vegetarian; vegan on request", photos: [PHOTOS.greens] },
  { chef: 1, title: "Solo Diners' Sunday", description: "Eight single seats, one long table, strangers at 7 and friends by 10. Solo bookings only.", daysFromNow: 17, hour: 18, price: 7000, min: 4, max: 8, types: ["SEAT"], photos: [PHOTOS.table] },
  { chef: 1, title: "Harvest Dinner", description: "Cancelled: not enough confirmed guests by the cutoff.", daysFromNow: -3, hour: 18, price: 7000, min: 6, max: 10, types: ["SEAT", "GROUP", "BUYOUT"], status: "CANCELLED" },
  // Tomás Villanueva
  { chef: 2, title: "Mole Night", description: "A black mole that takes two days, fresh tortillas off the comal, and mezcal you bring.", daysFromNow: -7, hour: 19, price: 7500, min: 4, max: 8, types: ["SEAT", "GROUP"], status: "COMPLETED", photos: [PHOTOS.mexican, PHOTOS.hands, PHOTOS.party] },
  { chef: 2, title: "Taco Tuesday, Properly", description: "Al pastor off a home trompo, carnitas, a salsa bar with eight bowls. Loud, cheap, over by ten.", daysFromNow: -28, hour: 19, price: 5000, min: 4, max: 10, types: ["SEAT", "GROUP"], status: "COMPLETED", photos: [PHOTOS.tacos, PHOTOS.room] },
  { chef: 2, title: "Masa Workshop Dinner", description: "Nixtamalize, grind, press and eat. You go home with a kilo of masa and a sense of superiority.", daysFromNow: -56, hour: 17, price: 9500, min: 4, max: 6, types: ["SEAT", "GROUP"], status: "COMPLETED", photos: [PHOTOS.toast, PHOTOS.hands] },
  { chef: 2, title: "Tlayudas Tomorrow Night", description: "Oaxacan street food at the table: tlayudas on the comal, memelas, aguas frescas. Casual and loud.", daysFromNow: 1, hour: 19, price: 6500, min: 1, max: 8, types: ["SEAT", "GROUP"], photos: [PHOTOS.mexican] },
  { chef: 2, title: "Tlayudas on the Patio", description: "Same menu, outside, heat lamps on. Bring a jacket and a bottle of mezcal.", daysFromNow: 12, hour: 18, price: 6500, min: 6, max: 10, types: ["SEAT", "GROUP"], photos: [PHOTOS.tacos, PHOTOS.candles] },
  { chef: 2, title: "Día de Muertos Table", description: "Pan de muerto, mole, hot chocolate. An ofrenda in the corner; bring a photo if you like.", daysFromNow: 19, hour: 19, price: 7500, min: 6, max: 8, types: ["GROUP", "BUYOUT"], photos: [PHOTOS.candles] },
  { chef: 2, title: "Masa Workshop Dinner", description: "Nixtamalize, grind, press and eat. You go home with a kilo of masa and a sense of superiority.", daysFromNow: 26, hour: 17, price: 9500, min: 4, max: 6, types: ["SEAT", "GROUP"], photos: [PHOTOS.toast] },
  // Hana Kim
  { chef: 3, title: "Banchan Marathon", description: "Twelve banchan, galbi jjim, and a stew for the table. Pace yourself.", daysFromNow: -10, hour: 19, price: 8000, min: 4, max: 8, types: ["SEAT", "GROUP"], status: "COMPLETED", photos: [PHOTOS.korean, PHOTOS.table, PHOTOS.party] },
  { chef: 3, title: "Kimchi Day", description: "We make a season of kimchi, then eat jjigae, pajeon and rice while it starts to ferment. You take a jar home.", daysFromNow: -49, hour: 15, price: 7000, min: 4, max: 8, types: ["SEAT", "GROUP"], status: "COMPLETED", photos: [PHOTOS.stew, PHOTOS.hands] },
  { chef: 3, title: "Hanshik Tasting", description: "A nine-course Korean tasting; the plated, quiet cousin of the banchan marathon.", daysFromNow: -70, hour: 19, price: 11000, min: 4, max: 6, types: ["SEAT", "GROUP", "BUYOUT"], status: "COMPLETED", photos: [PHOTOS.plate, PHOTOS.candles] },
  { chef: 3, title: "Banchan for Six", description: "Past its cutoff with too few confirmed guests: the go/no-go job will cancel it. Here so the admin button has something to do.", daysFromNow: 2, hour: 19, price: 8000, min: 6, max: 8, types: ["SEAT", "GROUP"] },
  { chef: 3, title: "Banchan & Braise", description: "The signature dinner: short rib braised with chestnuts and jujube, a dozen side dishes, soju you bring.", daysFromNow: 6, hour: 19, price: 8000, min: 4, max: 8, types: ["SEAT", "GROUP", "BUYOUT"], photos: [PHOTOS.korean, PHOTOS.bowl] },
  { chef: 3, title: "Kimchi Jjigae Weeknight", description: "A Tuesday. One stew, rice, three banchan, done by 9. The cheapest seat on the site.", daysFromNow: 14, hour: 19, price: 4000, min: 2, max: 6, types: ["SEAT", "GROUP"], photos: [PHOTOS.stew] },
  { chef: 3, title: "Hanshik Tasting", description: "A nine-course Korean tasting; the plated, quiet cousin of the banchan marathon.", daysFromNow: 28, hour: 19, price: 11000, min: 4, max: 6, types: ["SEAT", "GROUP", "BUYOUT"], photos: [PHOTOS.plate] },
  // Luca Bianchi
  { chef: 4, title: "Roman Trattoria Sunday", description: "Fried artichokes, cacio e pepe rolled by hand, saltimbocca, maritozzi. Lunch that runs into dinner.", daysFromNow: -28, hour: 14, price: 7500, min: 4, max: 8, types: ["SEAT", "GROUP", "BUYOUT"], status: "COMPLETED", photos: [PHOTOS.pasta, PHOTOS.wine, PHOTOS.room] },
  { chef: 4, title: "Cacio e Pepe Night", description: "Three pastas, one of them twice. Bring a Lazio red if you can find one, anything red if you can't.", daysFromNow: -45, hour: 19, price: 7000, min: 4, max: 8, types: ["SEAT", "GROUP", "BUYOUT"], status: "COMPLETED", photos: [PHOTOS.pasta2, PHOTOS.party] },
  { chef: 4, title: "Carbonara Clinic", description: "Guanciale, pecorino, eggs, no cream, no arguments. Hands-on, then dinner.", daysFromNow: -84, hour: 18, price: 8500, min: 4, max: 6, types: ["SEAT", "GROUP"], status: "COMPLETED", photos: [PHOTOS.hands, PHOTOS.pasta] },
  { chef: 4, title: "Cacio e Pepe Night", description: "Three pastas, one of them twice. Bring a Lazio red if you can find one, anything red if you can't.", daysFromNow: 8, hour: 19, price: 7000, min: 4, max: 8, types: ["SEAT", "GROUP", "BUYOUT"], photos: [PHOTOS.pasta2, PHOTOS.wine] },
  { chef: 4, title: "Pasta for Eight", description: "Your table, your people, my pasta. Whole-table bookings only, six to eight guests.", daysFromNow: 15, hour: 19, price: 8000, min: 6, max: 8, types: ["BUYOUT"], photos: [PHOTOS.pasta] },
  { chef: 4, title: "Roman Trattoria Sunday", description: "The Sunday lunch again. Same menu, new artichokes.", daysFromNow: 24, hour: 14, price: 7500, min: 4, max: 8, types: ["SEAT", "GROUP", "BUYOUT"], photos: [PHOTOS.room] },
  { chef: 4, title: "Carbonara Clinic", description: "Guanciale, pecorino, eggs, no cream, no arguments. Hands-on, then dinner.", daysFromNow: 36, hour: 18, price: 8500, min: 4, max: 6, types: ["SEAT", "GROUP"], photos: [PHOTOS.hands] },
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

async function main(): Promise<string> {
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
        photoUrls: c.photos,
        slug: c.slug,
        bio: c.bio,
        credentials: c.credentials,
        instagram: c.instagram,
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
    await db.menu.create({
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
    const menu = await db.menu.create({ data: { chefId: profile.id, title: c.menu.title, courses: c.menu.courses } });
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
        bio: "Applied through the intake form. Cooks Southern food out of a Crown Heights kitchen and wants to host eight on Fridays.",
        credentials: "Line cook, 3 years",
        status,
        paymentHandle: `@applicant-${i + 1}`,
        reviewNote: status === "REJECTED" ? "Tell us more about where you've cooked and send a sample menu." : null,
        cuisines: { connect: [{ id: cuisineBySlug["Southern"] }] },
      },
    });
  }

  const guests = [];
  for (const [i, name] of guestNames.entries()) {
    guests.push(
      await db.user.create({
        data: { email: `guest${i + 1}@example.test`, name, emailVerified: new Date(), ...(i === 0 ? { phone: "+12125550101", phoneVerifiedAt: new Date() } : {}) },
      }),
    );
  }
  const G = guests.length;

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
        // Most dinners post their menu; a few show the "closer to the date" note.
        menuId: i % 4 === 3 ? null : menuIds[e.chef],
        title: e.title,
        description: e.description,
        startsAt,
        durationMin: 150,
        priceCents: e.price,
        minGuests: e.min,
        maxGuests: e.max,
        allowedBookingTypes: e.types,
        goNoGoAt: new Date(startsAt.getTime() - RULES.GO_NO_GO_HOURS * HOUR),
        goNoGoCheckedAt: status === "COMPLETED" || status === "CANCELLED" ? new Date(startsAt.getTime() - RULES.GO_NO_GO_HOURS * HOUR) : null,
        status,
        mode: "UNSOLD",
        borough: chef.borough,
        byob: true,
        byobNote: "Bring whatever you like to drink; nothing is sold or included.",
        dietaryNotes: e.dietary ?? null,
        photoUrls: e.photos ?? [],
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
        { guest: (i + 0) % G, type: "GROUP", size: 2, status: "ATTENDED" },
        { guest: (i + 1) % G, type: "SEAT", size: 1, status: "ATTENDED" },
        { guest: (i + 2) % G, type: "SEAT", size: 1, status: "NO_SHOW" },
        { guest: (i + 3) % G, type: "SEAT", size: 1, status: "CANCELLED" },
        { guest: (i + 4) % G, type: "GROUP", size: 2, status: "ATTENDED" },
      ];
    } else if (status === "CANCELLED") {
      plan = [
        { guest: (i + 0) % G, type: "GROUP", size: 2, status: "CANCELLED" },
        { guest: (i + 1) % G, type: "SEAT", size: 1, status: "CANCELLED" },
      ];
    } else if (status === "PUBLISHED") {
      if (e.types.length === 1 && e.types[0] === "BUYOUT") {
        plan = [{ guest: (i + 1) % G, type: "BUYOUT", size: e.min, status: "CONFIRMED", note: "One vegetarian" }];
      } else if (e.types.includes("SEAT")) {
        plan = [
          { guest: (i + 0) % G, type: "SEAT", size: 1, status: "CONFIRMED" },
          { guest: (i + 1) % G, type: "GROUP", size: 2, status: "REQUESTED", note: "No nuts, please" },
          { guest: (i + 2) % G, type: "SEAT", size: 1, status: "EXPIRED" },
        ];
        if (i % 3 === 0) plan.push({ guest: (i + 3) % G, type: "SEAT", size: 1, status: "CANCELLED" });
      } else {
        plan = [{ guest: (i + 0) % G, type: "GROUP", size: 3, status: "REQUESTED" }];
      }
      // Solo-only dinners can't take groups.
      plan = plan.filter((p) => e.types.includes(p.type));
    }

    let mode: "UNSOLD" | "OPEN" | "BOUGHT_OUT" = "UNSOLD";
    for (const p of plan) {
      const guest = guests[p.guest];
      const amount = p.type === "BUYOUT" ? e.price * Math.max(p.size, e.min) : e.price * p.size;
      // Requests are recent so the expiry job (48 h) leaves the demo data alone; everything else was booked well ahead.
      const createdAt = p.status === "REQUESTED" ? new Date(Date.now() - (1 + (p.guest % 3)) * HOUR) : new Date(startsAt.getTime() - (10 + p.guest) * DAY);
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

      // The solo attended seat on each completed dinner stays unreviewed, so a guest has a review to leave.
      if (p.status === "ATTENDED" && p.type !== "SEAT") {
        const bodies = [
          "Warm host, generous portions, left with new friends. Would book again.",
          "Great food and a very relaxed table. Bring more wine than you think.",
          "The kind of dinner you can't get in a restaurant: the chef sat down with us for dessert.",
          "Portions were huge and the stories were better. Only wish it ran later.",
          "Came alone, sat next to a couple from Astoria and a nurse from Bed-Stuy. We have a group chat now.",
          "The apartment is small, the table is long, the food kept coming. Exactly the point.",
          "Second course was the best thing I've eaten this year and I ate it standing in a kitchen.",
          "Tight on timing, loose on everything else. Doors at 7:15, first plate at 7:30, out by 10:30.",
          "Brought a bottle, left with a recipe and a jar of something fermented.",
          "Felt like a friend's dinner party where the friend happens to cook professionally.",
          "Four of us booked together and still ended up talking to the other half of the table more.",
          "The chef explained every dish without it turning into a lecture. Rare.",
        ];
        await db.review.create({
          data: {
            bookingId: booking.id,
            eventId: event.id,
            chefId: chefIds[e.chef],
            authorId: guest.id,
            rating: (i + p.guest) % 7 === 3 ? 3 : 4 + ((i + p.guest) % 2),
            body: bodies[(i + p.guest) % bodies.length],
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

  return `Seeded ${chefs.length} chefs (+3 applicants), ${guests.length} guests, ${events.length} events, ${bookingsCreated} bookings, ${reviewsCreated} reviews.`;
}

/** Wipe the demo data and load it again. Also reachable from /api/admin/seed when DEMO_SEED=true. */
export async function seedDemo(client: Db): Promise<string> {
  db = client;
  return main();
}

// `pnpm db:seed` (tsx prisma/seed.ts): run against the configured database and exit.
if (process.argv[1] && /prisma[\/]seed(\.ts)?$/.test(process.argv[1])) {
  const client = createPrismaClient();
  seedDemo(client)
    .then((summary) => console.log(summary))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => client.$disconnect());
}
