"use client";

import { useActionState } from "react";
import { reviewChefAction } from "@/app/actions/chefs";
import type { ActionResult } from "@/app/actions/bookings";
import { fieldClass, FormError } from "./form-ui";

export function ReviewChefForm({ profileId, status }: { profileId: string; status: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(reviewChefAction, null);
  const btn = "rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50";
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="profileId" value={profileId} />
      <FormError message={state && !state.ok ? state.error : undefined} />
      <label className="flex flex-col gap-1 text-sm">
        Note to the chef <span className="text-xs text-muted">(optional; shown on their account page)</span>
        <textarea name="note" rows={2} maxLength={500} className={fieldClass} />
      </label>
      <div className="flex flex-wrap gap-2">
        {status !== "APPROVED" && (
          <button type="submit" name="decision" value="APPROVED" disabled={pending} className={`${btn} bg-accent text-white`}>Approve</button>
        )}
        {status === "APPLIED" && (
          <button type="submit" name="decision" value="REJECTED" disabled={pending} className={`${btn} border border-line hover:border-accent`}>Reject</button>
        )}
        {status === "APPROVED" && (
          <button type="submit" name="decision" value="SUSPENDED" disabled={pending} className={`${btn} border border-red-300 text-red-700 dark:border-red-800 dark:text-red-300`}>Suspend</button>
        )}
      </div>
    </form>
  );
}
