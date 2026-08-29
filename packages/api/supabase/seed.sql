-- IWWEI sample data (reference SQL — use `pnpm api:seed` for auth users + data)
-- Requires schema.sql applied first.

-- Demo actors are created via scripts/seed.cjs (Supabase Auth API).
-- This file documents the seeded dataset structure.

-- Admins (3):
--   admin@iwwei.demo, admin2@iwwei.demo, admin3@iwwei.demo

-- Editorials (5):
--   Editorial Planeta   (publisher@planeta.demo)     — active, CPM €2.50
--   Norma Editorial     (publisher@norma.demo)       — active, CPM €3.00
--   Editorial Alba      (publisher@alba.demo)        — active, CPM €2.75
--   Anagrama            (publisher@anagrama.demo)    — active, CPM €3.25
--   Salamandra          (publisher@salamandra.demo)  — pending (admin approval)

-- Content: 17 items (11 books, 2 comics, 1 document, 1 news, 1 podcast, 1 draft/review)
-- Payments: 8 transactions for demo users
-- CPM: 8 settlements (Jul paid, Aug pending)
-- Promotions: 5 campaigns
