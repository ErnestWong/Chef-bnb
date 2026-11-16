"use client";

import { useEffect, useRef } from "react";

const field = "rounded-xl border border-line bg-surface px-4 py-3 text-lg";

/** Step 1: the number. Big, numeric keyboard on phones, nothing else to fill in. */
export function PhoneField({ error }: { error?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      Mobile number
      <input
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        autoFocus
        required
        placeholder="(212) 555-1234"
        aria-invalid={error ? true : undefined}
        className={`${field} tracking-wide`}
      />
      <span className="text-xs text-muted">A US or Canadian mobile number. We text you a six-digit code.</span>
    </label>
  );
}

/** Step 2: six digits. Autofills from the SMS on iOS and Android, and submits itself when complete. */
export function CodeField({ error }: { error?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      6-digit code
      <input
        ref={ref}
        name="code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]*"
        maxLength={7}
        required
        placeholder="123456"
        aria-invalid={error ? true : undefined}
        className={`${field} font-mono text-2xl tracking-[0.4em]`}
        onChange={(e) => {
          const digits = e.currentTarget.value.replace(/\D/g, "");
          if (digits.length === 6) e.currentTarget.form?.requestSubmit();
        }}
      />
    </label>
  );
}
