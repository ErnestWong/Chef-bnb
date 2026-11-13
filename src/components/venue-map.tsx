import { BOROUGH_LABELS } from "@/lib/format";
import type { Borough } from "@/generated/prisma/enums";

type Props = {
  neighborhood: string;
  borough: Borough;
  crossStreets: string;
  /** Already rounded (~3 decimals) before storage; never the exact address. */
  lat: number;
  lng: number;
};

/**
 * Neighborhood-level location. With a Mapbox token this renders a static map
 * image with a rounded pin; without one it falls back to text, so the page
 * works before checklist item 6 is done. The exact address is never passed in.
 */
export function VenueMap({ neighborhood, borough, crossStreets, lat, lng }: Props) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const label = `${neighborhood}, ${BOROUGH_LABELS[borough]} · near ${crossStreets}`;
  const src = token
    ? `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-l+c2410c(${lng},${lat})/${lng},${lat},13.5,0/640x320@2x?access_token=${encodeURIComponent(token)}`
    : null;

  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-surface">
      {src ? (
        // Static image from Mapbox; next/image is skipped to avoid remote-pattern config for a dev-only token.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`Map of ${label}`} width={640} height={320} className="h-56 w-full object-cover" />
      ) : (
        <div className="flex h-40 items-center justify-center bg-accent-soft/60 text-sm text-muted">
          Map arrives with the Mapbox token
        </div>
      )}
      <figcaption className="px-4 py-3 text-sm">
        <span className="font-medium">{neighborhood}</span>, {BOROUGH_LABELS[borough]} · near {crossStreets}
        <span className="block text-xs text-muted">Exact address is emailed to confirmed guests 48 hours before.</span>
      </figcaption>
    </figure>
  );
}
