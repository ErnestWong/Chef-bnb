import type { ReactNode } from "react";

export const fieldClass = "rounded-md border border-line bg-surface px-3 py-2 text-sm";

export function Field({ label, hint, error, children }: { label: ReactNode; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && !error && <span className="text-xs text-muted">{hint}</span>}
      {error && (
        <span role="alert" className="text-xs text-red-700 dark:text-red-300">
          {error}
        </span>
      )}
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
      {message}
    </p>
  );
}
