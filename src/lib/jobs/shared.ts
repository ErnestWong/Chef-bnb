import type { JobResult } from "./types";

export const HOUR = 3600 * 1000;

export function emptyResult(): JobResult {
  return { processed: 0, emails: 0, errors: [] };
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
