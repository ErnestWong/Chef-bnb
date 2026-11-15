import Image from "next/image";
import Link from "next/link";
import { BRAND_PHOTOS } from "@/lib/brand-photos";

/** Six photos in a row, the brand deck's mood slide, leading to past dinners. */
export function MoodStrip() {
  return (
    <section aria-label="What a dinner looks like" className="border-t border-line">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">What it&apos;s like</p>
            <h2 className="font-display mt-2 text-3xl">Late-night, a little undone, plated with care.</h2>
          </div>
          <Link href="/events/past" className="rounded-full border border-line px-5 py-2.5 text-sm font-medium hover:border-accent hover:text-accent">
            Past dinners and reviews
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {BRAND_PHOTOS.mood.map((p) => (
            <li key={p.src} className="relative aspect-[4/5] overflow-hidden rounded-xl bg-paper-2">
              <Image src={p.src} alt={p.alt} fill sizes="(min-width: 1024px) 180px, (min-width: 640px) 33vw, 50vw" className="object-cover" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
