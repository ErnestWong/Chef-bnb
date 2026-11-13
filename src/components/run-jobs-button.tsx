"use client";

import { useActionState } from "react";
import { runJobsAction, type RunJobsResult } from "@/app/actions/admin";
import { JOB_LABELS, JOB_NAMES } from "@/lib/jobs/types";

export function RunJobsButton() {
  const [state, action, pending] = useActionState<RunJobsResult | null, FormData>(runJobsAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <button type="submit" disabled={pending} className="rounded-full border border-line px-5 py-2.5 text-sm font-medium hover:border-accent disabled:opacity-50">
          {pending ? "Running…" : "Run scheduled jobs now"}
        </button>
      </div>
      {state && !state.ok && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{state.error}</p>}
      {state?.ok && (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Job</th>
                <th className="px-4 py-2 font-medium">Changed</th>
                <th className="px-4 py-2 font-medium">Emails</th>
                <th className="px-4 py-2 font-medium">Errors</th>
              </tr>
            </thead>
            <tbody>
              {JOB_NAMES.map((name) => {
                const r = state.report.jobs[name];
                return (
                  <tr key={name} className="border-t border-line">
                    <td className="px-4 py-2">{JOB_LABELS[name]}</td>
                    <td className="px-4 py-2 tabular-nums">{r.processed}</td>
                    <td className="px-4 py-2 tabular-nums">{r.emails}</td>
                    <td className={`px-4 py-2 text-xs ${r.errors.length ? "text-red-700 dark:text-red-300" : "text-muted"}`}>{r.errors.length ? r.errors.join("; ") : "none"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-muted">
            Ran {new Date(state.report.ranAt).toLocaleString("en-US", { timeZone: "America/New_York" })} ET · emails via {state.transport}
            {state.transport === "console" ? " (RESEND_API_KEY unset: emails were printed to the server log)" : ""}
          </p>
        </div>
      )}
    </form>
  );
}
