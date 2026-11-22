# Express + Drizzle + Zod + Cookie Sessions + Vitest

```bash
npm install
npm test            # 21 tests, no Docker or database needed (PGlite)
npm run test:watch
npm run test:cov
npm run db:generate # after changing src/db/schema.ts
```

Run for real (needs Postgres): set `DATABASE_URL` and `SESSION_SECRET`, run the migration SQL in `drizzle/`, then `npm run dev`.

Production notes: replace the default MemoryStore with a persistent store (e.g. connect-pg-simple) and pass it as `sessionStore`.
