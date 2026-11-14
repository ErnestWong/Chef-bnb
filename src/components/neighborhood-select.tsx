import type { Borough } from "@/generated/prisma/enums";
import { BOROUGH_LABELS } from "@/lib/format";
import { BOROUGH_ORDER, NEIGHBORHOODS } from "@/lib/nyc/neighborhoods";

/**
 * One dropdown for "where": each borough is a group, its neighborhoods the
 * options. With `boroughOptions` the group also offers the whole borough
 * (value = borough code), which the dinner filters use for "All of Brooklyn".
 * Plain <select>, so it works in server-rendered forms and client forms alike.
 */
export function NeighborhoodSelect({
  name,
  defaultValue,
  anyLabel,
  boroughOptions = false,
  className,
  required,
}: {
  name: string;
  defaultValue?: string;
  /** First option, e.g. "Anywhere" or "Choose a neighborhood". */
  anyLabel: string;
  boroughOptions?: boolean;
  className?: string;
  required?: boolean;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className={className} required={required}>
      <option value="">{anyLabel}</option>
      {BOROUGH_ORDER.map((b: Borough) => (
        <optgroup key={b} label={BOROUGH_LABELS[b]}>
          {boroughOptions && <option value={b}>All of {BOROUGH_LABELS[b]}</option>}
          {NEIGHBORHOODS[b].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
