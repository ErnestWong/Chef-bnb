// Vitest stand-in for the `server-only` package, which throws when imported
// outside a React Server Component bundle. Aliased in vitest.config.ts so the
// Postgres-backed tests can exercise server modules directly.
export {};
