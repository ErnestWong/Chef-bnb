import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted">
        <p className="font-mono text-xs uppercase tracking-wide">One table · one chef · everyone at it</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/terms" className="hover:text-accent">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-accent">
            Privacy
          </Link>
          <Link href="/events" className="hover:text-accent">
            Dinners
          </Link>
          <Link href="/chefs" className="hover:text-accent">
            Chefs
          </Link>
          <Link href="/host" className="hover:text-accent">
            Host a dinner
          </Link>
          <Link href="/signin" className="hover:text-accent">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
