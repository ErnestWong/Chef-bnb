export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-accent">
        New York City
      </p>
      <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
        Dinner parties, cooked by real chefs, in real homes.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        A better night out than a restaurant, easier than hosting. Book a seat,
        bring your friends, or take the whole table.
      </p>
      <p className="mt-12 text-sm text-muted">Coming soon.</p>
    </main>
  );
}
