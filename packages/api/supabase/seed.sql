-- IWWEI sample data (reference SQL — use `pnpm api:seed` for auth users + data)
-- Requires schema.sql applied first.

-- Demo actors are created via scripts/seed.cjs (Supabase Auth API).
-- This file documents the seeded dataset structure.

-- Editorials (created by seed script):
--   Editorial Planeta  (publisher@planeta.demo) — active, CPM €2.50
--   Norma Editorial  (publisher@norma.demo)   — active, CPM €3.00

-- Content: 5 items (books, comics, news, podcast, document)
-- Payments: 4 transactions for demo users
-- CPM: 4 settlements (Jul paid, Aug pending)
-- Promotions: 3 campaigns
