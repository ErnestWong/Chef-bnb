import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-4 text-muted">That table isn&apos;t set.</p>
      <Link href="/" className="mt-8 text-accent underline-offset-2 hover:underline">
        Back to the front door
      </Link>
    </main>
  );
}
