import type { Borough } from "@/generated/prisma/enums";

/**
 * Neighborhoods a chef can pick for a venue and a guest can filter by, grouped
 * by borough. Manhattan and Brooklyn are complete at the level people use
 * when they say where they live; the other boroughs list the areas most
 * likely to host. A venue's `neighborhood` column holds one of these names.
 */
export const NEIGHBORHOODS: Record<Borough, readonly string[]> = {
  MANHATTAN: [
    "Financial District", "Battery Park City", "Tribeca", "Chinatown", "Two Bridges", "Lower East Side", "SoHo", "Nolita",
    "Little Italy", "NoHo", "Greenwich Village", "West Village", "East Village", "Alphabet City", "Union Square", "Gramercy",
    "Flatiron", "Chelsea", "Meatpacking District", "Kips Bay", "Murray Hill", "Midtown East", "Midtown West", "Hell's Kitchen",
    "Hudson Yards", "Turtle Bay", "Sutton Place", "Lenox Hill", "Upper East Side", "Yorkville", "Carnegie Hill", "Lincoln Square",
    "Upper West Side", "Manhattan Valley", "Morningside Heights", "Harlem", "East Harlem", "Hamilton Heights", "Washington Heights",
    "Inwood", "Roosevelt Island",
  ],
  BROOKLYN: [
    "Brooklyn Heights", "DUMBO", "Vinegar Hill", "Downtown Brooklyn", "Fort Greene", "Clinton Hill", "Boerum Hill", "Cobble Hill",
    "Carroll Gardens", "Gowanus", "Red Hook", "Park Slope", "South Slope", "Windsor Terrace", "Prospect Heights", "Crown Heights",
    "Prospect Lefferts Gardens", "Flatbush", "Ditmas Park", "Kensington", "Sunset Park", "Bay Ridge", "Dyker Heights", "Bensonhurst",
    "Borough Park", "Midwood", "Sheepshead Bay", "Brighton Beach", "Coney Island", "Williamsburg", "Greenpoint", "Bushwick",
    "Bedford-Stuyvesant", "East Williamsburg", "Brownsville", "East New York", "Canarsie",
    "Mill Basin", "Marine Park",
  ],
  QUEENS: [
    "Long Island City", "Astoria", "Sunnyside", "Woodside", "Jackson Heights", "Elmhurst", "Corona", "Flushing", "Forest Hills",
    "Rego Park", "Kew Gardens", "Ridgewood", "Glendale", "Bayside", "Jamaica", "Richmond Hill", "Rockaway Beach",
  ],
  BRONX: ["Mott Haven", "South Bronx", "Riverdale", "Kingsbridge", "Fordham", "Belmont", "Pelham Bay", "City Island", "Morris Park"],
  STATEN_ISLAND: ["St. George", "Stapleton", "Tompkinsville", "New Brighton", "Todt Hill", "Great Kills", "Tottenville"],
};

/** Borough order in dropdowns: where the dinners are first. */
export const BOROUGH_ORDER: readonly Borough[] = ["MANHATTAN", "BROOKLYN", "QUEENS", "BRONX", "STATEN_ISLAND"];

const index = new Map<string, Borough>();
for (const borough of BOROUGH_ORDER) for (const n of NEIGHBORHOODS[borough]) index.set(n.toLowerCase(), borough);

/** The borough a listed neighborhood belongs to, or null for a name not on the list. */
export function boroughOf(neighborhood: string): Borough | null {
  return index.get(neighborhood.trim().toLowerCase()) ?? null;
}

/** Canonical spelling for a listed neighborhood (case-insensitive match), or null. */
export function canonicalNeighborhood(name: string): string | null {
  const b = boroughOf(name);
  if (!b) return null;
  const key = name.trim().toLowerCase();
  return NEIGHBORHOODS[b].find((n) => n.toLowerCase() === key) ?? null;
}
