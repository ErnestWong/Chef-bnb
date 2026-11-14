"use client";

import { useState } from "react";

/** Copies a URL to the clipboard; falls back to selecting the text when the clipboard API is unavailable. */
export function CopyLinkButton({ url, label = "Copy link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  }
  return (
    <button type="button" onClick={copy} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:border-accent">
      {copied ? "Copied" : label}
    </button>
  );
}
