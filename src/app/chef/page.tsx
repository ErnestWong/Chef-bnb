import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Badge, ButtonLink, Container, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/roles";
import { formatEventDateTime, formatEventDay, formatMoney, pluralize } from "@/lib/format";
import { confirmedSeats, heldSeats, listEventsForChef } from "@/lib/queries/bookings";
import { getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Chef dashboard" };

export default function ChefPage({ searchParams }: PageProps<"/chef">) {
  return (
    <main className="flex-1">
      <Container className="max-w-4xl py-12">
        <Suspense fallback={<p className="mt-6 text-sm text-muted">Loading…</p>}>
          <ChefHome searchParams={searchParams} />
        </Suspense>
      </Container>
    </main>
  );
}

/**
 * One URL for the whole chef journey: no application yet → the pitch;
 * applied → status and what's next; approved → the dashboard (with a
 * first-run checklist until the first dinner exists); rejected or
 * suspended → the note from the team.
 */
async function ChefHome({ searchParams }: { searchParams: PageProps<"/chef">["searchParams"] }) {
  const [user, params] = await Promise.all([requireUser("/chef"), searchParams]);
  const profile = await getDb().chefProfile.findUnique({
    where: { userId: user.id },
    select: { displayName: true, slug: true, status: true, paymentHandle: true, reviewNote: true, createdAt: true, updatedAt: true },
  });
  if (!profile) redirect("/host");

  if (profile.status === "APPLIED") return <ApplicationStatus profile={profile} justApplied={params.applied === "1"} />;
  if (profile.status === "REJECTED" || profile.status === "SUSPENDED") return <ApplicationClosed profile={profile} status={profile.status} />;
  if (!hasRole(user.roles, "CHEF")) {
    // Approved a moment ago; the session picks the role up within two minutes.
    return <ApplicationStatus profile={profile} justApplied={false} approvedPendingSession />;
  }

  const events = await listEventsForChef(user);
  const now = new Date();
  const upcoming = events.filter((e) => e.startsAt > now);
  const past = events.filter((e) => e.startsAt <= now);
  const awaiting = events.reduce((n, e) => n + e.bookings.filter((b) => b.status === "REQUESTED").length, 0);

  return (
    <>
      <h1 className="font-display text-4xl">Chef dashboard</h1>
      <div className="mt-6 flex flex-col gap-8">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href={`/chefs/${profile.slug}`} className="font-medium hover:text-accent">{profile.displayName}</Link>
          <Badge tone="accent">{profile.status.toLowerCase()}</Badge>
          {!profile.paymentHandle && <Badge tone="warn">No payment handle yet</Badge>}
          {awaiting > 0 && <Badge tone="warn">{pluralize(awaiting, "request")} awaiting payment</Badge>}
        </div>

        {events.length === 0 ? (
          <FirstRun profile={profile} />
        ) : (
          <div>
            <Link href="/chef/events/new" className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">+ New dinner</Link>
          </div>
        )}
        <Section title="Upcoming" events={upcoming} empty="No upcoming dinners yet." />
        {past.length > 0 && <Section title="Past" events={past} empty="No past dinners yet." />}
      </div>
    </>
  );
}

type ProfileBits = { displayName: string; slug: string; paymentHandle: string | null; reviewNote: string | null; createdAt: Date; updatedAt: Date };

function ApplicationStatus({ profile, justApplied, approvedPendingSession = false }: { profile: ProfileBits; justApplied: boolean; approvedPendingSession?: boolean }) {
  const steps = [
    { title: "Applied", body: `${formatEventDay(profile.createdAt)}. Thanks, ${profile.displayName}.`, state: "done" as const },
    { title: "Review", body: approvedPendingSession ? "Done: you're approved." : "A real person reads every application, usually within a few days.", state: approvedPendingSession ? ("done" as const) : ("current" as const) },
    { title: "Approved", body: approvedPendingSession ? "Your dashboard unlocks in a moment; refresh if it hasn't." : "You get an email either way. Once approved, you publish your first dinner from here.", state: approvedPendingSession ? ("current" as const) : ("todo" as const) },
  ];
  return (
    <>
      {justApplied && (
        <p role="status" className="mb-6 rounded-xl bg-accent-soft px-4 py-3 text-sm">
          Application sent. We&apos;ll email you when there&apos;s news.
        </p>
      )}
      <h1 className="font-display text-4xl">{approvedPendingSession ? "You're approved" : "Application received"}</h1>
      <ol className="mt-8 flex flex-col gap-0">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${s.state === "done" ? "bg-accent text-white" : s.state === "current" ? "border-2 border-accent text-accent" : "border border-line text-muted"}`}
              >
                {s.state === "done" ? "✓" : i + 1}
              </span>
              {i < steps.length - 1 && <span aria-hidden className={`my-1 w-px flex-1 ${s.state === "done" ? "bg-accent" : "bg-line"}`} />}
            </div>
            <div className="pb-8">
              <p className={`font-medium ${s.state === "todo" ? "text-muted" : ""}`}>{s.title}</p>
              <p className="mt-0.5 text-sm text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="font-display text-2xl">While you wait</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {[
            "Write the menu for your first dinner: four or five courses, one line each.",
            "Pick a date three to five weeks out and a price per seat.",
            "Gather a few photos of your food and your table; uploads come soon.",
            "See what other dinners look like so yours fits in and stands out.",
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <span aria-hidden className="text-accent">·</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/events" variant="secondary">Browse dinners</ButtonLink>
          <ButtonLink href="/chefs" variant="secondary">See chef profiles</ButtonLink>
        </div>
      </section>
    </>
  );
}

function ApplicationClosed({ profile, status }: { profile: ProfileBits; status: "REJECTED" | "SUSPENDED" }) {
  const suspended = status === "SUSPENDED";
  return (
    <>
      <h1 className="font-display text-4xl">{suspended ? "Your hosting is paused" : "Not this time"}</h1>
      <p className="mt-3 max-w-prose text-muted">
        {suspended
          ? "An admin paused your chef account; your dinners are hidden and you can't publish new ones for now."
          : "We couldn't approve your application right now. Thanks for applying; it isn't a judgment on your cooking."}
      </p>
      {profile.reviewNote && (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-5 text-sm">
          <p className="text-xs text-muted">Note from the team</p>
          <p className="mt-1">{profile.reviewNote}</p>
        </div>
      )}
      <p className="mt-6 text-sm text-muted">
        Questions, or something changed? Reply to the email you received and we&apos;ll take another look.
      </p>
    </>
  );
}

/** Approved, no dinners yet: a short checklist instead of two empty sections. */
function FirstRun({ profile }: { profile: ProfileBits }) {
  const items = [
    { done: true, title: "Approved to host", body: "Your profile is live." },
    { done: Boolean(profile.paymentHandle), title: "Payment handle", body: profile.paymentHandle ? `Guests pay ${profile.paymentHandle} directly.` : "Add a Venmo or Zelle handle so guests can pay you." },
    { done: false, title: "Publish your first dinner", body: "Date, menu, price per seat, how many guests. About five minutes." },
    { done: false, title: "Share your profile", body: `/chefs/${profile.slug} is yours to send around once a dinner is up.` },
  ];
  return (
    <section className="rounded-2xl border border-accent/40 bg-surface p-6">
      <h2 className="font-display text-2xl">You&apos;re in. Let&apos;s get your first dinner up.</h2>
      <ol className="mt-4 flex flex-col gap-3">
        {items.map((it) => (
          <li key={it.title} className="flex gap-3 text-sm">
            <span aria-hidden className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${it.done ? "bg-accent text-white" : "border border-line text-muted"}`}>
              {it.done ? "✓" : ""}
            </span>
            <span>
              <span className={`font-medium ${it.done ? "text-muted line-through" : ""}`}>{it.title}</span>
              <span className="block text-muted">{it.body}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-3">
        <ButtonLink href="/chef/events/new">Create your first dinner</ButtonLink>
        <ButtonLink href={`/chefs/${profile.slug}`} variant="secondary">View your profile</ButtonLink>
      </div>
    </section>
  );
}

function Section({ title, events, empty }: { title: string; events: Awaited<ReturnType<typeof listEventsForChef>>; empty: string }) {
  return (
    <section>
      <h2 className="font-display text-2xl">{title}</h2>
      {events.length === 0 ? (
        <div className="mt-3">
          <EmptyState title={empty} />
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {events.map((e) => {
            const requested = e.bookings.filter((b) => b.status === "REQUESTED").length;
            const confirmed = confirmedSeats(e);
            return (
              <li key={e.id}>
                <Link href={`/chef/events/${e.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-accent">
                  <div>
                    <p className="text-sm text-accent">{formatEventDateTime(e.startsAt)}</p>
                    <p className="font-display text-xl">{e.title}</p>
                    <p className="text-sm text-muted">{formatMoney(e.priceCents)} / seat · min {e.minGuests}, max {e.maxGuests}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>{e.status.toLowerCase()}</Badge>
                    <Badge tone={confirmed >= e.minGuests ? "accent" : "warn"}>
                      {confirmed}/{e.minGuests} confirmed
                    </Badge>
                    <Badge>{heldSeats(e)}/{e.maxGuests} held</Badge>
                    {requested > 0 && <Badge tone="warn">{pluralize(requested, "request")} to review</Badge>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
