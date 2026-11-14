import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui";
import { POLICIES_UPDATED, SUPPORT_EMAIL } from "@/lib/site";

export type LegalSection = {
  id: string;
  heading: string;
  body: ReactNode;
};

/** Plain, readable layout for the terms and privacy pages: a contents list, then numbered sections. */
export function LegalPage({ title, intro, sections, sibling }: { title: string; intro: ReactNode; sections: LegalSection[]; sibling: { href: string; label: string } }) {
  return (
    <main className="flex-1">
      <Container className="max-w-3xl py-12 sm:py-16">
        <p className="text-sm text-muted">
          <Link href="/" className="hover:text-accent">Home</Link> / {title}
        </p>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-muted">
          Last updated {formatUpdated(POLICIES_UPDATED)}. See also the <Link href={sibling.href} className="text-accent underline-offset-2 hover:underline">{sibling.label}</Link>.
        </p>
        <div className="mt-6 flex flex-col gap-3 text-base leading-relaxed">{intro}</div>

        <nav aria-label="Contents" className="mt-8 rounded-2xl border border-line bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">Contents</p>
          <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="hover:text-accent">
                  <span className="text-muted">{i + 1}.</span> {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 flex flex-col gap-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="font-display text-2xl">
                <span className="text-muted">{i + 1}.</span> {s.heading}
              </h2>
              <div className="legal-body mt-3 flex flex-col gap-3 text-base leading-relaxed">{s.body}</div>
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
          Questions about this page?{" "}
          {SUPPORT_EMAIL ? (
            <>Email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent underline-offset-2 hover:underline">{SUPPORT_EMAIL}</a>.</>
          ) : (
            <>Reply to any email we send you.</>
          )}
        </p>
      </Container>
    </main>
  );
}

/** Bulleted list inside a section body. */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2 pl-5">
      {items.map((item, i) => (
        <li key={i} className="list-disc">{item}</li>
      ))}
    </ul>
  );
}

function formatUpdated(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
