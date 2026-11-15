/**
 * Site photography. Stock placeholders (Unsplash) chosen for the brand guide's
 * mix: people mid-moment, the table, the kitchen. Replace with the Covers
 * shoot once the first dinners are photographed; keep the keys, swap the URLs.
 */
const unsplash = (id: string, w = 1600) => `https://images.unsplash.com/photo-${id}?w=${w}&q=70`;

export const BRAND_PHOTOS = {
  /** Home hero: a long table outdoors, everyone talking. */
  hero: { src: unsplash("1528605248644-14dd04022da1", 1800), alt: "A long table of people eating and talking at dusk" },
  /** Host page hero: a chef finishing a plate under a warm lamp. */
  host: { src: unsplash("1577219491135-ce391730fb2c", 1800), alt: "A chef plating a dish under a warm lamp" },
  /** Mood strip, in the deck's order: people, food, room. */
  mood: [
    { src: unsplash("1510812431401-41d2bd2722f3", 900), alt: "Friends clinking glasses of red wine" },
    { src: unsplash("1530062845289-9109b2c9c868", 900), alt: "Hands reaching across a table full of food" },
    { src: unsplash("1536392706976-e486e2ba97af", 900), alt: "A candlelit table set for a long dinner" },
    { src: unsplash("1605522561233-768ad7a8fabf", 900), alt: "Seasoning a pan in a home kitchen" },
    { src: unsplash("1551218808-94e220e084d2", 900), alt: "Chopping herbs on a wooden board" },
    { src: unsplash("1482275548304-a58859dc31b7", 900), alt: "Wine glasses on a set table in low light" },
  ],
} as const;
